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
    dates.forEach(async (d) => {
      if (d.check_in_policy !== "none") {
        const matches = await strapi.entityService.findMany('api::match.match', {
          filters: {
            tournament: d.tournament.id
          },
          populate: {
            team_1: true,
            team_2: true
          }
        })
        const teams = matches.map(m => [m.team_1, m.team_2]).flat().filter(t=>t)
        const uncheckedTeams = teams.filter(t => !t.checked_in)
        if (uncheckedTeams.length > 0) {
          /*if (d.check_in_policy === "delay") {
            console.log("Cannot start tournament until all players have checked in")
            await strapi.entityService.create('api::event-date.event-date', {
              data: {
                ...d,
                tournament: d.tournament.id,
                date: new Date(d.datetime.getTime() + 30 * 60000)
              }
            })
            return
          }*/
          console.log("The following teams have not checked in: ", uncheckedTeams.map(p => p.name))
        }
      }
      const updates = {}
      if (d.status_action) {
        updates.status = d.status_action
      }
      if (d.stage_action) {
        updates.stage = d.stage_action
      }
      strapi.entityService.update('api::tournament.tournament', d.tournament.id, {
        data: updates
      });
    })
  }
};