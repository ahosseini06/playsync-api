module.exports = {
  routes: [
    {
      "method": "GET",
      "path": "/can-register",
      "handler": "tournament.canRegister",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/public-tournament/:id",
      "handler": "tournament.getPublic",
      "config": {
        "policies": []
      }
    }
  ]
}