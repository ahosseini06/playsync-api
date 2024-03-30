'use strict';

/**
 * team service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::team.team', ({ strapi }) => ({
  async checkShape(teamID, shape) {
    const team = await strapi.entityService.findOne('api::team.team', teamID, {
      populate: {
        players: true
      }
    })
    return team.players.length === shape.num_players
  },

  async checkRegisterPerms(userID, teamID) {
    const team = await strapi.entityService.findOne('api::team.team', teamID)
    if (team.role_can_register === "coach") {
      const matchingCoaches = await strapi.entityService.findMany('api::coach.coach', {
        filters: {
          team: teamID,
          user: userID
        }
      })
      return matchingCoaches.length > 0
    }
    return true
  }
}));
