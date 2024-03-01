module.exports = {
  routes: [
    {
      "method": "GET",
      "path": "/can-register",
      "handler": "tournament.canRegister",
      "config": {
        "policies": []
      }
    }
  ]
}