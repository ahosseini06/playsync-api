'use strict';

/**
 * coach controller
 */

const jwt = require('jwt-decode');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::coach.coach', (({ strapi }) => ({
  async create(ctx) {
    //user retrieval
    const authorizationHeader = ctx.headers.authorization;
    if (!authorizationHeader) {
      return ctx.badRequest('Authorization header is required');
    }
    const [scheme, token] = authorizationHeader.split(' ');
    const userID = jwt.jwtDecode(token).id;
    const response = await super.create(ctx);
    const newResponse = await strapi.entityService.update('api::coach.coach', response.data.id, {
      data: {
        user: userID
      }
    });
    return newResponse
  }
})));
