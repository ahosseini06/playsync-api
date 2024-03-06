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

  async getPublic(ctx){
    const { id } = ctx.params;
    const tournaments = await strapi.entityService.findMany("api::tournament.tournament", {
      filters: {
        public_id: id
      },
      populate: {
        pools: true,
        matches: true
      }
    });
    const { name, pools, matches} = tournaments[0]
    return { data: { name, pools, matches } }
  },

  async getPrivate(ctx){
    const { id } = ctx.params;
    const tournaments = await strapi.entityService.findMany("api::tournament.tournament", {
      filters: {
        private_id: id
      },
      populate: {
        pools: true,
        matches: true
      }
    });
    return { data: tournaments[0] }
  },

  async create(ctx) {
    if (!ctx.request.body.data) {
      return ctx.badRequest('Data is required');
    }
    //date creation
    const dates = ctx.request.body.data.dates ? await Promise.all(ctx.request.body.data.dates.map(async (date) => {
      const eventDate = await strapi.entityService.create('api::event-date.event-date', {
        data: {
          ...date,
          publishedAt: new Date(),
        }
      });
      return eventDate.id
    })) : [];
    //private id creation
    const privateID = Math.floor(1000000000 + Math.random() * 9000000000);
    let matches = [0]
    while (matches.length > 0){
      matches = await strapi.entityService.findMany('api::tournament.tournament', {
        filters: {
          private_id: privateID.toString()
        }
      })
    }
    //public id creation
    const publicID = await strapi.service('plugin::content-manager.uid').generateUIDField({
      contentTypeUID: "api::tournament.tournament",
      field: "public_id",
      data: ctx.request.body.data
    })
    //user retrieval
    const authorizationHeader = ctx.headers.authorization;
    if (!authorizationHeader) {
      return ctx.badRequest('Authorization header is required');
    }
    const [scheme, token] = authorizationHeader.split(' ');
    const userID = jwt.jwtDecode(token).id;
    //tournament creation
    const response = await super.create(ctx);
    await strapi.entityService.update('api::tournament.tournament', response.data.id, {
      data: {
        event_dates: dates,
        private_id: privateID.toString(),
        public_id: publicID,
        user: userID
      }
    });
    return response
  },

  async canRegister(ctx) {
    const id = ctx.request.url.split("?id=")[1];
    const tournament = await strapi.entityService.findOne("api::tournament.tournament", id);
    return tournament && tournament.status === 'scheduled'
  }
}));