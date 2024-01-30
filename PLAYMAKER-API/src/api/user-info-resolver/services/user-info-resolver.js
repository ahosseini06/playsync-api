'use strict';

/**
 * user-info-resolver service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-info-resolver.user-info-resolver');
