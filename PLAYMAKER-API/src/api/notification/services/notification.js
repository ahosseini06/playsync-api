'use strict';

/**
 * notification service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::notification.notification', ({ strapi }) => ({
  async sendStartConfirmation(tournamentID) {
    const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentID, {
      populate: {
        user: true
      }
    });
    await strapi.entityService.create('api::notification.notification', {
      data: {
        target_user: tournament.user ? tournament.user.id : null,
        tournament: tournamentID,
        message: 'Your tournament is ready to start',
        action: 'start-tournament',
        publishedAt: new Date()
      }
    });
  }
}));
