'use strict';

/**
 * tournament service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tournament.tournament', ({ strapi }) => ({
  async generatePools(tournament) {
    //get teams
    const teams = tournament.teams;
  },

  async manageCheckIn(d){
    if (d.check_in_policy !== "none") {
      const matches = await strapi.entityService.findMany('api::match.match', {
        filters: {
          tournament: d.tournament.id
        },
        populate: {
          team_1: true,
          team_2: true
        }
      })
      const teams = matches.map(m => [m.team_1, m.team_2]).flat().filter(t=>t)
      const uncheckedTeams = teams.filter(t => !t.checked_in)
      if (uncheckedTeams.length > 0) {
        /*if (d.check_in_policy === "delay") {
          console.log("Cannot start tournament until all players have checked in")
          await strapi.entityService.create('api::event-date.event-date', {
            data: {
              ...d,
              tournament: d.tournament.id,
              date: new Date(d.datetime.getTime() + 30 * 60000)
            }
          })
          return
        }*/
        console.log("The following teams have not checked in: ", uncheckedTeams.map(p => p.name))
      }
    }
  }
}));
