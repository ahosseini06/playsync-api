'use strict';

/**
 * tournament service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tournament.tournament', ({ strapi }) => ({
  async generatePools(tournament) {
    const populatedTournament = await strapi.entityService.findOne('api::tournament.tournament', tournament.id, {
      populate: {
        teams: true,
        pools: true
      }
    })
    if (populatedTournament.pools && populatedTournament.pools.length > 0) {
      populatedTournament.pools.forEach(async p => {
        await strapi.entityService.delete('api::pool.pool', p.id)
      })
    }
    const teamRankings = await Promise.all(populatedTournament.teams.map(async t => {
      const rankingObjs = await strapi.entityService.findMany('api::ranking.ranking', {
        filters: {
          team: t.id,
          tournament: tournament.id
        }
      })
      return {team: t.id, ranking: rankingObjs[0].current_rank}
    }))
    const sortedRankings = teamRankings.sort((a, b) => a.ranking - b.ranking).map(obj => obj.team)
    const table = []
    let currentRow = []
    sortedRankings.forEach((team, i) => {
      currentRow.push(team)
      if(currentRow.length === Math.ceil(sortedRankings.length/tournament.pool_size)){
        table.push(currentRow)
        currentRow = []
      }
    })
    if(currentRow.length > 0){
      table.push(currentRow)
    }
    const pools = []
    table[0].forEach((team, i) => {
      pools.push(table.map(row => row[i]).filter(t => t))
    })
    pools.forEach(async (p, i) => {
      await strapi.entityService.create('api::pool.pool', {
        data: {
          tournament: tournament.id,
          name: `Pool ${i + 1}`,
          teams: p,
          publishedAt: new Date()
        }
      })
    })
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
