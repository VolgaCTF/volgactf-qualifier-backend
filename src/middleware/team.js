const TeamController = require('../controllers/team')

function getTeam (request, response, next) {
  TeamController.get(request.session.identityID, function (err, team) {
    if (err) {
      next(err)
    } else {
      request.team = team
      next()
    }
  })
}

module.exports.getTeam = getTeam
