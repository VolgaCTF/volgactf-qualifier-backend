const SupervisorController = require('../controllers/supervisor')

function getSupervisor (request, response, next) {
  SupervisorController.get(request.session.identityID, function (err, supervisor) {
    if (err) {
      next(err)
    } else {
      request.supervisor = supervisor
      next()
    }
  })
}

module.exports.getSupervisor = getSupervisor
