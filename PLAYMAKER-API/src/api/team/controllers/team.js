'use strict';

/**
 * team controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jwt-decode');

module.exports = createCoreController('api::team.team', ({ strapi }) => ({
  async create(ctx) {
    if (!ctx.request.body.data) {
      return ctx.badRequest('Data is required');
    }
    //player creation
    const players = await Promise.all(ctx.request.body.data.players.map(async p =>
      await strapi.entityService.create('api::player.player', {
        data: p,
        publishedAt: new Date()
      })
    ));
    //coach creation
    const coaches = await Promise.all(ctx.request.body.data.coaches.map(async c =>
      await strapi.entityService.create('api::coach.coach', {
        data: c,
        publishedAt: new Date()
      })
    ))
    //team creation
    const response = await super.create(ctx);
    await strapi.entityService.update('api::team.team', response.data.id, {
      data: {
        players: players.map(p => p.id),
        coaches: coaches.map(c => c.id)
      }
    });
    return response
  },

  async playerExists(ctx) {
    const { name, jerseyNumber } = ctx.params;
    //user retrieval
    const authorizationHeader = ctx.headers.authorization;
    if (!authorizationHeader) {
      return ctx.badRequest('Authorization header is required');
    }
    const [scheme, token] = authorizationHeader.split(' ');
    const user = jwt.jwtDecode(token).id;
    const filters = {user}
    if (name) {
      filters.name = name
    }
    if (jerseyNumber) {
      filters.jersey_number = jerseyNumber
    }
    const players = await strapi.entityService.findMany('api::player.player', { filters });
    const data = players.length > 0 ? players : false;
    return { data }
  },

  async coachExists(ctx) {
    const { name } = ctx.params;
    //user retrieval
    const authorizationHeader = ctx.headers.authorization;
    if (!authorizationHeader) {
      return ctx.badRequest('Authorization header is required');
    }
    const [scheme, token] = authorizationHeader.split(' ');
    const user = jwt.jwtDecode(token).id;
    const coaches = await strapi.entityService.findMany('api::coach.coach', {
      filters: {
        name,
        user
      }
    });
    const data = coaches.length > 0 ? coaches : false;
    return { data }
  },

  async createTeam(ctx) {
    //user retrieval
    const authorizationHeader = ctx.headers.authorization;
    if (!authorizationHeader) {
      return ctx.badRequest('Authorization header is required');
    }
    const [scheme, token] = authorizationHeader.split(' ');
    const user = jwt.jwtDecode(token).id;
    const { players, coaches } = ctx.request.body.data;
    const reformatEntity = async (p, type) => {
      if (typeof p === 'object') {
        const obj = await strapi.entityService.create(`api::${type}.${type}`, {
          data: {
            ...p,
            publishedAt: new Date(),
            user
          }
        })
        return obj.id
      }
      return p
    }
    const playerIDs = await Promise.all(players.map(p => reformatEntity(p, 'player')))
    const coachIDs = await Promise.all(coaches.map(c => reformatEntity(c, 'coach')))
    const response = await strapi.entityService.create('api::team.team', {
      data: {
        ...ctx.request.body.data,
        players: playerIDs,
        coaches: coachIDs,
        publishedAt: new Date(),
        user
      }
    })
    return response
  }
}));