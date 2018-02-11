const TaskCategory = require('../models/task-category')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')

class TaskCategoryController {
  static indexByTasks (taskIds, callback) {
    TaskCategory
      .query()
      .whereIn('taskId', taskIds)
      .then(function (taskCategories) {
        callback(null, taskCategories)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static indexByTask (taskId, callback) {
    TaskCategory
      .query()
      .where('taskId', taskId)
      .then(function (taskCategories) {
        callback(null, taskCategories)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = TaskCategoryController
