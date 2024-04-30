'use strict';

/**
 * player controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const axios = require('axios');
const jwt = require('jwt-decode');

module.exports = createCoreController('api::player.player', ({ strapi }) => ({
  async createUser(ctx) {
    try {
      const user = await axios.post('http://localhost:1337/api/auth/local/register', ctx.request.body)
      if (ctx.request.body.type) {
        const type = ctx.request.body.type.toLowerCase()
        const entity = await strapi.entityService.create(`api::${type}.${type}`, {
          data: {
            ...ctx.request.body,
            publishedAt: new Date(),
            user: user.data.user.id
          }
        })
      }
      return user.data
    } catch (e) {
      const { status, name, message } = e
      return {
        data: null,
        error: {
          status,
          name,
          message
        }
      }
    }
  },

  async create(ctx) {
    //user retrieval
    const authorizationHeader = ctx.headers.authorization;
    if (!authorizationHeader) {
      return ctx.badRequest('Authorization header is required');
    }
    const [scheme, token] = authorizationHeader.split(' ');
    const userID = jwt.jwtDecode(token).id;
    const response = await super.create(ctx);
    const newResponse = await strapi.entityService.update('api::player.player', response.data.id, {
      data: {
        user: userID
      }
    });
    return newResponse
  }
}));
