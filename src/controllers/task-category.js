const _ = require('underscore')
const TaskCategory = require('../models/task-category')
const Task = require('../models/task')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')
const { TASK_OPENED, TASK_CLOSED } = require('../utils/constants')

class TaskCategoryController {
  static fetch (privateData = false) {
    return new Promise(function (resolve, reject) {
      let taskPromise = Task.query()
      if (!privateData) {
        taskPromise = taskPromise
          .where('state', TASK_OPENED)
          .orWhere('state', TASK_CLOSED)
      }

      taskPromise
        .then(function (tasks) {
          const taskIdList = _.map(tasks, function (task) {
            return task.id
          })
          return TaskCategory
            .query()
            .whereIn('taskId', taskIdList)
        })
        .then(function (taskCategories) {
          resolve(taskCategories)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

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

  static fetchByTask (taskId) {
    return new Promise(function (resolve, reject) {
      TaskCategory
        .query()
        .where('taskId', taskId)
        .then(function (taskCategories) {
          resolve(taskCategories)
        })
        .catch(function (err) {
          reject(err)
        })
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
