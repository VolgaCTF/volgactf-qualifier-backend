const _ = require('underscore')
const Task = require('../models/task')
const TaskRewardScheme = require('../models/task-reward-scheme')
const { InternalError, TaskRewardSchemeNotFoundError } = require('../utils/errors')
const logger = require('../utils/logger')
const { TASK_OPENED, TASK_CLOSED } = require('../utils/constants')

class TaskRewardSchemeController {
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
          return TaskRewardScheme
            .query()
            .whereIn('taskId', taskIdList)
        })
        .then(function (taskRewardSchemes) {
          resolve(taskRewardSchemes)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  getByTaskId (taskId) {
    return new Promise(function (resolve, reject) {
      TaskRewardScheme
        .query()
        .where('taskId', taskId)
        .first()
        .then(function (taskRewardScheme) {
          if (taskRewardScheme) {
            resolve(taskRewardScheme)
          } else {
            reject(new TaskRewardSchemeNotFoundError())
          }
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }
}

module.exports = new TaskRewardSchemeController()
