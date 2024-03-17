'use strict';

/**
 * match service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::match.match', ({ strapi }) =>({
  async checkBracketAdvance(matchID) {
    const match = await strapi.entityService.findOne('api::match.match', matchID, {
      populate: {
        tournament: true,
        pool: true
      }
    });
    const tournament = await strapi.entityService.findOne('api::tournament.tournament', match.tournament.id, {
      populate: {
        pools: true
      }
    });
    if(tournament.stage !== 'play-offs') {
      return
    }
    const matches = await strapi.entityService.findMany('api::match.match', {
      filters: {
        tournament: tournament.id,
        latest_bracket: true
      }
    });
    if (matches.length <= 1) {
      return
    }
    const unfinished = matches.map(m => {
      if (!m.complete) {
        return m
      }
      return null
    }).filter(m => m)
    if (unfinished.length > 0) {
      return
    }
    await strapi.service('api::tournament.tournament').continueBrackets(tournament)
  }
}));
