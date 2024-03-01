module.exports = {
  //activate tournaments on start date:
  '*/30 * * * *': async ({ strapi }) => {
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
    dates.forEach((d) => {
      strapi.entityService.update('api::tournament.tournament', d.tournament.id, {
        data: { status: 'active' }
      });
      console.log('Tournament ' + d.tournament.id + ' is now active');
    })
  }
};