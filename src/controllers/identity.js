const SupervisorController = require('./supervisor')
const TeamController = require('./team')

const { UnknownIdentityError } = require('../utils/errors')

class IdentityController {
  fetch (request) {
    return new Promise(function (resolve, reject) {
      const token = request.session.token

      if (request.scope.isSupervisor()) {
        SupervisorController.get(request.session.identityID, function (err, supervisor) {
          if (err) {
            reject(err)
          } else {
            resolve({
              id: request.session.identityID,
              role: supervisor.rights,
              name: supervisor.username,
              token: token
            })
          }
        })
      } else if (request.scope.isTeam()) {
        TeamController.get(request.session.identityID, function (err, team) {
          if (err) {
            reject(err)
          } else {
            resolve({
              id: request.session.identityID,
              role: 'team',
              name: team.name,
              emailConfirmed: team.emailConfirmed,
              token: token
            })
          }
        })
      } else if (request.scope.isGuest()) {
        resolve({
          role: 'guest',
          token: token
        })
      } else {
        reject(new UnknownIdentityError())
      }
    })
  }
}

module.exports = new IdentityController()
