'use strict';

/**
 * player controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::player.player', ({ strapi }) => ({
  async createUser(ctx) {
    let playerID;
    let coachID;
    console.log(ctx.request.body.type)
    switch (ctx.request.body.type) {
      case 'Player':
        const player = await strapi.entityService.create('api::player.player', {
          data: {
            ...ctx.request.body,
            publishedAt: new Date()
          }
        })
        playerID = player.id
        break;
      case 'Coach':
        const coach = await strapi.entityService.create('api::coach.coach', {
          data: {
            ...ctx.request.body,
            publishedAt: new Date()
          }
        })
        coachID = coach.id
        break;
    }
    const user = await strapi.db.query('plugin::users-permissions.user').create({
      data: {
        ...ctx.request.body,
        players: [playerID],
        coach: coachID
      }
    })
    return user
  }
}));
