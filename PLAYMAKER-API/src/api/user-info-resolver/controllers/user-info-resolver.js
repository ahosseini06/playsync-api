// @ts-nocheck
'use strict';

/**
 * user-info-resolver controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::user-info-resolver.user-info-resolver', ({strapi})=> ({
    async isUsernameAvailable(ctx) {
        let users = await strapi.entityService.findMany(
            "plugin::users-permissions.user", { filters: { username : ctx.params.username }}
        );

        return users.length === 0;
    },
    
    async isEmailAvailable(ctx) {
        let users = await strapi.entityService.findMany(
            "plugin::users-permissions.user", { filters: { email: ctx.params.email.toLowerCase()}}
        );

        return users.length === 0;
    }
    
}));
