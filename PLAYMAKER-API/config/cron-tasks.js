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
      await strapi.service('api::tournament.tournament').manageCheckIn(d)
      const updates = {}
      if (d.status_action) {
        updates.status = d.status_action
      }
      if (d.stage_action) {
        updates.stage = d.stage_action
        if(d.stage_action === "configuration"){
          await strapi.service('api::tournament.tournament').generatePools(d.tournament)
        }
      }
      strapi.entityService.update('api::tournament.tournament', d.tournament.id, {
        data: updates
      });
    })
  }
};