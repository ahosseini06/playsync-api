'use strict';

/**
 * match controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::match.match', ({ strapi }) => ({
  async update(ctx) {
    const response = await super.update(ctx);
    const populated = await strapi.entityService.findOne('api::match.match', response.data.id, {
      populate: {
        team_1: true,
        team_2: true,
      }
    });
    const winnerID = populated[populated.winner].id
    console.log(winnerID)
    const bestSeed = Math.min(populated.team_1.current_seed, populated.team_2.current_seed);
    await strapi.entityService.update('api::team.team', winnerID, {
      data: {
        current_seed: bestSeed,
        wins_in_current_pool: populated.winner === 'team_1' ? populated.team_1.wins_in_current_pool + 1 : populated.team_2.wins_in_current_pool + 1
      }
    });
    await strapi.service('api::match.match').checkBracketAdvance(response.data.id);
    return response
  }
}));
