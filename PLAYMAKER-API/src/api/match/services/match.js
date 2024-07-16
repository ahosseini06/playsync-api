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
  },

  async assignMatchesToCourts(teams, matches, courts) {
    const courtAssignment = {};
    const courtBooking = {}
    
    // Initialize the court assignment structure
    for (let court of courts) {
      courtAssignment[court.id] = [];
    }
  
    // Helper function to find adjacent courts
    function getAdjacentCourts(courtId) {
      const court = courts.find(c => c.id === courtId);
      return court ? court.adjacent_courts : [];
    }
  
    // Helper function to find the nearest available court
    function findNearestCourt(teamLastCourt, availableCourts) {
      if (!teamLastCourt) return availableCourts[0]; // If no previous court, return the first available
  
      for (let court of availableCourts) {
        if (getAdjacentCourts(teamLastCourt).includes(court)) {
          return court;
        }
      }
      return availableCourts[0]; // If no adjacent court found, return the first available
    }
  
    const teamLastCourts = {};
  
    // Sort matches by their number
    matches.sort((a, b) => a.number - b.number);
  
    for (let match of matches) {
      const { id, team_1, team_2, number } = match;
      
      const availableCourts = courts.map(c => c.id).filter(c => !courtBooking[c.toString()] || courtBooking[c.toString()].indexOf(number) === -1);
      
      // Determine the nearest available court for both teams
      const nearestCourtForTeam1 = findNearestCourt(teamLastCourts[team_1], availableCourts);
      const nearestCourtForTeam2 = findNearestCourt(teamLastCourts[team_2], availableCourts);
      
      let assignedCourt;
  
      // Assign to the court that is nearest for either team, prefer team 1's nearest court
      if (nearestCourtForTeam1 === nearestCourtForTeam2) {
        assignedCourt = nearestCourtForTeam1;
      } else if (getAdjacentCourts(nearestCourtForTeam1).includes(nearestCourtForTeam2)) {
        assignedCourt = nearestCourtForTeam1;
      } else {
        assignedCourt = nearestCourtForTeam1;
      }
  
      courtAssignment[assignedCourt].push(match);
      await strapi.entityService.update('api::match.match', match.id, {
        data: {
          court: assignedCourt
        }
      })
      if (courtBooking[assignedCourt]) {
        courtBooking[assignedCourt].push(number)
      } else {
        courtBooking[assignedCourt] = [number]
      }
  
      // Update the last court each team played on
      teamLastCourts[team_1] = assignedCourt;
      teamLastCourts[team_2] = assignedCourt;
    }
  }
}));
