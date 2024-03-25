const TaskHint = require('../models/task-hint')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')

class TaskHintController {
  static fetchByTask (taskId) {
    return new Promise(function (resolve, reject) {
      TaskHint
        .query()
        .where('taskId', taskId)
        .orderBy('id')
        .then(function (taskHints) {
          resolve(taskHints)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  static listByTask (taskId, callback) {
    TaskHint
      .query()
      .where('taskId', taskId)
      .orderBy('id')
      .then(function (taskHints) {
        callback(null, taskHints)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = TaskHintController
