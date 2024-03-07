'use strict';

/**
 * team controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

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
  }
}));