module.exports = {
  routes: [
    {
      "method": "GET",
      "path": "/player-exists/:name/:jerseyNumber?",
      "handler": "team.playerExists",
      "config": { "policies": [] }
    },
    {
      "method": "GET",
      "path": "/coach-exists/:name",
      "handler": "team.coachExists",
      "config": { "policies": [] }
    },
    {
      "method": "POST",
      "path": "/register-team",
      "handler": "team.registerTeam",
      "config": { "policies": [] }
    }
  ]
}