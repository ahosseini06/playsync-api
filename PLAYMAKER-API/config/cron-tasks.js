module.exports = {
  //activate tournaments on start date:
  '*/1 * * * *': async ({ strapi }) => {
    const currentDate = new Date();
    currentDate.setSeconds(0);
    currentDate.setMilliseconds(0);
    const dates = await strapi.entityService.findMany('api::event-date.event-date', {
      filters: {
        datetime: currentDate
      },
      populate: {
        tournament: true
      }
    });
    dates.forEach(async (d) => {
      await strapi.service('api::tournament.tournament').openCheckIn(d)
      await strapi.service('api::tournament.tournament').manageCheckIn(d)
      const updates = {}
      if (d.status_action) {
        updates.status = d.status_action
      }
      if (d.stage_action) {
        updates.stage = d.stage_action
        switch (updates.stage) {
          case "configuration":
            await strapi.service('api::tournament.tournament').generatePools(d.tournament)
            break;
          case "pool-play":
            await strapi.service('api::notification.notification').sendStartConfirmation(d.tournament.id)
            return
          case "play-offs":
            await strapi.service('api::tournament.tournament').generateInitialBrackets(d.tournament)
            break;
        }
      }
      strapi.entityService.update('api::tournament.tournament', d.tournament.id, {
        data: updates
      });
    })
  }
};