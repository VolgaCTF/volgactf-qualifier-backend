const SupervisorTaskSubscription = require('../models/supervisor-task-subscription')
const logger = require('../utils/logger')
const { InternalError, SupervisorTaskSubscriptionAlreadyExistsError, SupervisorTaskSubscriptionNotFoundError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')

function isSupervisorTaskUniqueConstraintViolation (err) {
  return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'supervisor_task_subscriptions_ndx_supervisor_task_unique')
}

class SupervisorTaskSubscriptionController {
  create (supervisorId, task, callback) {
    return new Promise(function (resolve, reject) {
      SupervisorTaskSubscription
        .query()
        .insert({
          supervisorId,
          taskId: task.id,
          createdAt: new Date()
        })
        .then(function (supervisorTaskSubscription) {
          resolve(supervisorTaskSubscription)
        })
        .catch(function (err) {
          if (isSupervisorTaskUniqueConstraintViolation(err)) {
            reject(new SupervisorTaskSubscriptionAlreadyExistsError())
          } else {
            logger.error(err)
            reject(new InternalError())
          }
        })
    })
  }

  fetchForSupervisor (supervisorId) {
    return new Promise(function (resolve, reject) {
      SupervisorTaskSubscription
        .query()
        .where('supervisorId', supervisorId)
        .then(function (supervisorTaskSubscriptions) {
          resolve(supervisorTaskSubscriptions)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  fetchForTask (taskId) {
    return new Promise(function (resolve, reject) {
      SupervisorTaskSubscription
        .query()
        .where('taskId', taskId)
        .then(function (supervisorTaskSubscriptions) {
          resolve(supervisorTaskSubscriptions)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  delete (supervisorId, task, callback) {
    return new Promise(function (resolve, reject) {
      SupervisorTaskSubscription
        .query()
        .delete()
        .where({
          supervisorId,
          taskId: task.id
        })
        .then(function (numDeleted) {
          if (numDeleted === 1) {
            resolve(null)
          } else {
            reject(new SupervisorTaskSubscriptionNotFoundError())
          }
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }
}

module.exports = new SupervisorTaskSubscriptionController()
