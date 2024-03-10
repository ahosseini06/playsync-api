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

  async openCheckIn(d) {
    if (d.open_check_in) {
      console.log("test")
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', d.tournament.id, {
        populate: {
          teams: true
        }
      })
      tournament.teams.forEach(async t => {
        await strapi.entityService.update('api::team.team', t.id, {
          data: {
            checked_in: false
          }
        })
      })
    }
  },

  async manageCheckIn(d){
    if (d.check_in_policy !== "none") {
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', d.tournament.id, {
        populate: {
          teams: true,
          user: true
        }
      })
      const teams = tournament.teams
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
        if (tournament.user) {
          await strapi.entityService.create('api::notification.notification', {
            data: {
              target_user: tournament.user.id,
              tournament: d.tournament.id,
              message: `The following teams have not checked in: ${uncheckedTeams.map(p => p.name).join(", ")}`,
              publishedAt: new Date()
            }
          })
        }
      }
    }
  },

  async setMatchTimes(tournamentID) {
    const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentID, {
      populate: {
        dates: true,
        matches: true
      }
    })
    const now = new Date()
    const currentDate = [now.getFullYear(), (now.getMonth() + 1).toString().padStart(2, '0'), now.getDate().toString().padStart(2, '0')].join("-")
    const matchesOnDay = tournament.matches.filter(m => m.day === currentDate)
    /*const endEvent = await strapi.entityService.findMany('api::event-date.event-date', {
      filters: {
        tournament: tournamentID,
        $or: [
          { stage: "buffer" },
          { stage: "complete" }
        ]
      },
      sort: "datetime"
    })
    const endTime = endEvent[0].datetime*/
    matchesOnDay.forEach(async (m, i) => {
      await strapi.entityService.update('api::match.match', m.id, {
        data: {
          time: new Date(new Date().getTime() + tournament.match_time_minutes*(i+1)*60000)
        }
      })
    })
  }
}));
