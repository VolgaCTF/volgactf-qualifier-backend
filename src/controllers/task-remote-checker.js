const TaskRemoteChecker = require('../models/task-remote-checker')
const { InternalError, TaskRemoteCheckerNotFoundError } = require('../utils/errors')
const logger = require('../utils/logger')

class TaskRemoteCheckerController {
  fetch () {
    return new Promise(function (resolve, reject) {
      TaskRemoteChecker
      .query()
      .then(function (taskRemoteCheckers) {
        resolve(taskRemoteCheckers)
      })
      .catch(function (err) {
        logger.error(err)
        reject(err)
      })
    })
  }

  getByTaskId (taskId) {
    return new Promise(function (resolve, reject) {
      TaskRemoteChecker
      .query()
      .where('taskId', taskId)
      .first()
      .then(function (taskRemoteChecker) {
        if (taskRemoteChecker) {
          resolve(taskRemoteChecker)
        } else {
          reject(new TaskRemoteCheckerNotFoundError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
    })
  }
}

module.exports = new TaskRemoteCheckerController()
