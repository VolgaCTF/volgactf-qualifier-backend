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

function getTeamSafe (request, response, next) {
  if (request.scope.isTeam()) {
    TeamController.get(request.session.identityID, function (err, team) {
      if (err) {
        next(err)
      } else {
        request.team = team
        next()
      }
    })
  } else {
    request.team = null
    next()
  }
}

module.exports.getTeam = getTeam
module.exports.getTeamSafe = getTeamSafe
