// @ts-nocheck
'use strict';

/**
 * tournament controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jwt-decode');

module.exports = createCoreController('api::tournament.tournament', ({strapi}) => ({    
    async find(ctx) {
        const authorizationHeader = ctx.headers.authorization;
        const [scheme, token] = authorizationHeader.split(' ');
        const decodedToken = jwt.jwtDecode(token);

        ctx.query = {
            filters: {
                user: {
                    id: {
                        $eq: decodedToken.id
                    }
                }
            }
        }

        const {data, meta} = await super.find(ctx);
        return {data, meta}
    }

}));