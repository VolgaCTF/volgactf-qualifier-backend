const TaskAnswer = require('../models/task-answer')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')

class TaskAnswerController {
  static listByTask (taskId, callback) {
    TaskAnswer
      .query()
      .where('taskId', taskId)
      .orderBy('id')
      .then(function (taskAnswers) {
        callback(null, taskAnswers)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = TaskAnswerController
