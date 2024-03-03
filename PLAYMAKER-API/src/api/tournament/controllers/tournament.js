// @ts-nocheck
'use strict';

/**
 * tournament controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jwt-decode');

module.exports = createCoreController('api::tournament.tournament', ({ strapi }) => ({
  async find(ctx) {
    const authorizationHeader = ctx.headers.authorization;
    if (!authorizationHeader) {
      return ctx.badRequest('Authorization header is required');
    }
    const [scheme, token] = authorizationHeader.split(' ');
    const decodedToken = jwt.jwtDecode(token);

    ctx.query = {
      filters: {
        user: {
          id: {
            $eq: decodedToken.id
          }
        }
      }
    }

    const { data, meta } = await super.find(ctx);
    return { data, meta }
  },

  async create(ctx) {
    const dates = await Promise.all(ctx.request.body.data.dates.map(async (d) => {
      const eventDate = await strapi.entityService.create('api::event-date.event-date', {
        data: {
          datetime: d,
          publishedAt: new Date(),
        }
      });
      return eventDate.id
    }));
    const response = await super.create(ctx);
    await strapi.entityService.update('api::tournament.tournament', response.data.id, {
      data: {
        event_dates: dates
      }
    });
    return response
  },

  async canRegister(ctx) {
    const id = ctx.request.url.split("?id=");
    const tournament = await strapi.entityService.findOne("api::tournament.tournament", id);
    return tournament.status === 'scheduled'
  }
}));