'use strict';

/**
 * team service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const sgMail = require('@sendgrid/mail');
const axios = require('axios');

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
  },

  async inviteUser(email, userData, teamID) {
    const activationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const user = await axios.post('http://localhost:1337/api/auth/local/register', {
      ...userData,
      username: userData.username ? userData.username : email,
      password: activationCode,
      invited_unconfirmed: true
    })
    if (userData.type) {
      const type = userData.type.toLowerCase()
      const entity = await strapi.entityService.create(`api::${type}.${type}`, {
        data: {
          ...userData,
          publishedAt: new Date(),
          user: user.data.user.id,
          team: teamID,
        }
      })
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sgMail.send({
      to: email,
      from: 'Math Curious <admin@mathcurious.com>',
      templateId: 'd-d5ee1040505048c5ae47a995ad77e063',
    })
  }
}));
