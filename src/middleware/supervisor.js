import SupervisorController from '../controllers/supervisor'

export function getSupervisor (request, response, next) {
  SupervisorController.get(request.session.identityID, (err, supervisor) => {
    if (err) {
      next(err)
    } else {
      request.supervisor = supervisor
      next()
    }
  })
}
