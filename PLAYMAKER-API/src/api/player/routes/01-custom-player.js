module.exports = {
  routes: [
    {
      "method": "POST",
      "path": "/auth/local/reg-user",
      "handler": "player.createUser",
      "config": {
        "policies": []
      }
    }
  ]
}