const SupervisorController = require('../controllers/supervisor')
const TeamController = require('../controllers/team')

const { UnknownIdentityError } = require('../utils/errors')

module.exports = function (request, response, next) {
  const token = request.session.token

  if (request.scope.isSupervisor()) {
    SupervisorController.get(request.session.identityID, function (err, supervisor) {
      if (err) {
        next(err)
      } else {
        request.identity = {
          id: request.session.identityID,
          role: supervisor.rights,
          name: supervisor.username,
          token: token
        }
        next()
      }
    })
  } else if (request.scope.isTeam()) {
    TeamController.get(request.session.identityID, function (err, team) {
      if (err) {
        next(err)
      } else {
        request.identity = {
          id: request.session.identityID,
          role: 'team',
          name: team.name,
          emailConfirmed: team.emailConfirmed,
          token: token
        }
        next()
      }
    })
  } else if (request.scope.isGuest()) {
    request.identity = {
      role: 'guest',
      token: token
    }
    next()
  } else {
    next(new UnknownIdentityError())
  }
}
