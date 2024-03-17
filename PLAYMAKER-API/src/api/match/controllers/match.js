'use strict';

/**
 * match controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::match.match', ({ strapi }) => ({
  async update(ctx) {
    const response = await super.update(ctx);
    await strapi.service('api::match.match').checkBracketAdvance(response.data.id);
    return response
  }
}));
