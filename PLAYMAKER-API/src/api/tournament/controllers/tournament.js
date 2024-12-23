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
      ...ctx.query,
      filters: {
        user: {
          id: decodedToken.id
        }
      }
    }

    const { data, meta } = await super.find(ctx);
    return { data, meta}
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
    if (tournaments[0]) {
      const { name, pools, matches} = tournaments[0]
      return { data: { name, pools, matches } }
    }
    return { data: null }
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
    const dates = ctx.request.body.data.dates && Array.isArray(ctx.request.body.data.dates) ? await Promise.all(ctx.request.body.data.dates.map(async (date) => {
      const eventDate = await strapi.entityService.create('api::event-date.event-date', {
        data: {
          ...date,
          publishedAt: new Date(),
        }
      });
      return eventDate.id
    })) : [];
    //shape creation
    const shapes = ctx.request.body.data.shapes && Array.isArray(ctx.request.body.data.shapes) ? await Promise.all(ctx.request.body.data.shapes.map(async (s) => {
      const shape = await strapi.entityService.create('api::shape.shape', {
        data: {
          ...s,
          publishedAt: new Date(),
        }
      });
      return shape.id
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
        ok_shapes: shapes,
        private_id: privateID.toString(),
        public_id: publicID,
        user: userID
      }
    });
    const newResponse = await strapi.entityService.findOne('api::tournament.tournament', response.data.id);
    return newResponse
  },

  async update(ctx) {
    //check if teams are added
    const response = await super.update(ctx)
    const tournament = await strapi.entityService.findOne("api::tournament.tournament", response.data.id);
    const newTeams = ctx.request.body.data.teams;
    if (newTeams && newTeams.length > 0) {
      await strapi.service('api::tournament.tournament').generatePools(tournament)
    }
    return tournament
  },

  async canRegister(ctx) {
    const id = ctx.request.url.split("?id=")[1];
    const tournament = await strapi.entityService.findOne("api::tournament.tournament", id);
    return tournament && tournament.status === 'scheduled'
  },

  async startPlay(ctx) {
    const id = ctx.request.url.split("?id=")[1];
    const tournament = await strapi.entityService.findOne("api::tournament.tournament", id);
    const notifications = await strapi.entityService.findMany("api::notification.notification", {
      filters: {
        tournament: id,
        action: 'start-tournament'
      }
    });
    if (notifications.length > 0) {
      await strapi.entityService.update("api::tournament.tournament", id, {
        data: {
          stage: 'pool-play'
        }
      })
      await strapi.service('api::tournament.tournament').setMatchTimes(id)
    }
    return tournament
  }
}));