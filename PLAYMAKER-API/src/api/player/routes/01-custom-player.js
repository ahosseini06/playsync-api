module.exports = {
  routes: [
    {
      "method": "POST",
      "path": "/auth/local/register",
      "handler": "player.createUser",
      "config": {
        "policies": []
      }
    }
  ]
}