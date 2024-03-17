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
      return { team: t.id, ranking: rankingObjs[0].current_rank }
    }))
    const sortedRankings = teamRankings.sort((a, b) => a.ranking - b.ranking).map(obj => obj.team)
    let table = []
    let currentRow = []
    sortedRankings.forEach((team, i) => {
      currentRow.push(team)
      if (currentRow.length === Math.ceil(sortedRankings.length / tournament.pool_size)) {
        table.push(currentRow)
        currentRow = []
      }
    })
    if (currentRow.length > 0) {
      table.push(currentRow)
    }
    const pools = []
    table = table.map((row, i) => {
      if(i % 2 === 1) {
        return row.reverse()
      }
      return row
    })
    console.log(table)
    table[0].forEach((team, i) => {
      pools.push(table.map(row => row[i]).filter(t => t))
    })
    pools.forEach(async (p, i) => {
      const pool = await strapi.entityService.create('api::pool.pool', {
        data: {
          tournament: tournament.id,
          name: `Pool ${i + 1}`,
          teams: p,
          publishedAt: new Date()
        }
      })
      await strapi.service('api::tournament.tournament').generateMatches(pool.id)
    })
  },

  async generateInitialBrackets(tournament) {
    const pools = await strapi.entityService.findMany('api::pool.pool', {
      filters: {
        tournament: tournament.id
      },
      populate: {
        teams: true
      }
    })
    let totalTeams = []
    pools.forEach(async p => {
      const teams = p.teams
      const sortedTeams = teams.sort((a, b) => b.wins_in_current_pool - a.wins_in_current_pool)
      totalTeams = totalTeams.concat(sortedTeams)
    })
    console.log(totalTeams)
    for (let i = 0; i < totalTeams.length / 2; i++) {
      await strapi.entityService.create('api::match.match', {
        data: {
          tournament: tournament.id,
          team_1: totalTeams[i].id,
          team_2: totalTeams[totalTeams.length - 1 - i].id,
          number: i + 1,
          publishedAt: new Date(),
          latest_bracket: true
        }
      })
    }
  },

  async continueBrackets(tournament) {
    const matches = await strapi.entityService.findMany('api::match.match', {
      filters: {
        tournament: tournament.id,
        latest_bracket: true
      },
      populate: {
        winner: true,
        team_1: true,
        team_2: true
      }
    })
    //set every current match to latest_bracket false
    matches.forEach(async m => {
      await strapi.entityService.update('api::match.match', m.id, {
        data: {
          latest_bracket: false
        }
      })
    })
    const totalTeams = matches.map(m => m[m.winner]).filter(t => t)
    for (let i = 0; i < totalTeams.length; i += 2) {
      await strapi.entityService.create('api::match.match', {
        data: {
          tournament: tournament.id,
          team_1: totalTeams[i].id,
          team_2: totalTeams[i + 1].id,
          number: i / 2 + 1,
          publishedAt: new Date(),
          latest_bracket: true
        }
      })
    }
  },

  async openCheckIn(d) {
    if (d.open_check_in) {
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

  async manageCheckIn(d) {
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
        matches: true,
        user: true
      }
    })
    const now = new Date()
    const currentDate = [now.getFullYear(), (now.getMonth() + 1).toString().padStart(2, '0'), now.getDate().toString().padStart(2, '0')].join("-")
    const matchesOnDay = tournament.matches.filter(m => !m.complete && m.day === currentDate).sort((a, b) => a.number - b.number)
    const firstMatchNumber = matchesOnDay[0].number
    const matchTemplates = []
    matchesOnDay.forEach(m => {
      if (matchTemplates.filter(t=>t.number === m.number).length === 0) {
        matchTemplates.push(m)
      }
    })
    const endEvents = await strapi.entityService.findMany('api::event-date.event-date', {
      filters: {
        tournament: tournamentID,
        $or: [
          { stage: "buffer" },
          { stage: "complete" }
        ]
      },
      sort: "datetime"
    })
    const endTime = endEvents.filter(e => (new Date(e.datetime)).getDate() === now.getDate())[0].datetime
    const timeInBetween = (new Date(endTime).getTime() - now.getTime()) / 60000
    const matchesThatCanFit = Math.floor(timeInBetween / tournament.match_time_minutes)
    matchTemplates.slice(0, matchesThatCanFit).forEach(async (t, i) => {
      matchesOnDay.filter(m => m.number === t.number).forEach(async (m) => {
        await strapi.entityService.update('api::match.match', m.id, {
          data: {
            time: new Date(now.getTime() + i * tournament.match_time_minutes * 60000)
          }
        })
      })
    })
    if (matchTemplates.length > matchesThatCanFit) {
      const tomorrow = new Date(now.getTime() + 86400000)
      const tomorrowDay = [tomorrow.getFullYear(), (tomorrow.getMonth() + 1).toString().padStart(2, '0'), tomorrow.getDate().toString().padStart(2, '0')].join("-")
      matchTemplates.slice(matchesThatCanFit).forEach(async (t, i) => {
        matchesOnDay.filter(m => m.number === t.number).forEach(async (m) => {
          await strapi.entityService.update('api::match.match', m.id, {
            data: {
              day: tomorrowDay
            }
          })
        })
      })
      await strapi.entityService.create('api::notification.notification', {
        data: {
          target_user: tournament.user.id,
          tournament: tournamentID,
          message: `${matchTemplates.length - matchesThatCanFit} matches have been moved to tomorrow due to time constraints`,
          publishedAt: new Date()
        }
      })
    }
  },

  async generateMatches(poolID) {
    const pool = await strapi.entityService.findOne('api::pool.pool', poolID, {
      populate: {
        tournament: true,
        teams: true
      }
    })
    const tournament = pool.tournament
    const teams = pool.teams
    const matches = []
    const teamsInNumber = Array(teams.length * 2).fill([])
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        let number = 1
        while (teamsInNumber[number].includes(teams[i].id) || teamsInNumber[number].includes(teams[j].id)) {
          number++
        }
        matches.push({
          tournament: tournament.id,
          pool: pool.id,
          team_1: teams[i].id,
          team_2: teams[j].id,
          number: number,
          publishedAt: new Date()
        })
        teamsInNumber[number] = [...teamsInNumber[number], teams[i].id, teams[j].id]
      }
    }
    matches.forEach(async m => {
      await strapi.entityService.create('api::match.match', {
        data: m
      })
    })
  },
}));
