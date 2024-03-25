const _ = require('underscore')
const Task = require('../models/task')
const TaskValue = require('../models/task-value')
const { InternalError, TaskValueNotFoundError } = require('../utils/errors')
const logger = require('../utils/logger')
const { TASK_OPENED, TASK_CLOSED } = require('../utils/constants')

class TaskValueController {
  fetch (privateData = false) {
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
          return TaskValue
            .query()
            .whereIn('taskId', taskIdList)
        })
        .then(function (taskValues) {
          resolve(taskValues)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  getByTasks (taskIds) {
    return new Promise(function (resolve, reject) {
      TaskValue
        .query()
        .whereIn('taskId', taskIds)
        .then(function (taskValues) {
          resolve(taskValues)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  getByTaskId (taskId) {
    return new Promise(function (resolve, reject) {
      TaskValue
        .query()
        .where('taskId', taskId)
        .first()
        .then(function (taskValue) {
          if (taskValue) {
            resolve(taskValue)
          } else {
            reject(new TaskValueNotFoundError())
          }
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }
}

module.exports = new TaskValueController()
