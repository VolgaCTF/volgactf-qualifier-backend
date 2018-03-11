const Task = require('../models/task')
const TaskCategory = require('../models/task-category')
const TaskAnswer = require('../models/task-answer')
const TaskHint = require('../models/task-hint')
const TaskRemoteChecker = require('../models/task-remote-checker')
const TaskValue = require('../models/task-value')
const TaskRewardScheme = require('../models/task-reward-scheme')

const TaskAnswerController = require('./task-answer')
const TaskCategoryController = require('./task-category')

const logger = require('../utils/logger')
const { InternalError, DuplicateTaskTitleError, TaskAlreadyOpenedError, TaskClosedError, TaskNotOpenedError,
  TaskAlreadyClosedError, TaskNotFoundError, RemoteCheckerAttachedError, RemoteCheckerUnavailableError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION, TASK_INITIAL, TASK_OPENED, TASK_CLOSED } = require('../utils/constants')

const _ = require('underscore')
const { transaction } = require('objection')

const EventController = require('./event')
const CreateTaskEvent = require('../events/create-task')
const UpdateTaskEvent = require('../events/update-task')
const OpenTaskEvent = require('../events/open-task')
const CloseTaskEvent = require('../events/close-task')
const CreateTaskCategoryEvent = require('../events/create-task-category')
const DeleteTaskCategoryEvent = require('../events/delete-task-category')
const RevealTaskCategoryEvent = require('../events/reveal-task-category')
const CreateTaskRemoteCheckerEvent = require('../events/create-task-remote-checker')

const remoteCheckerController = require('./remote-checker')
const taskRemoteCheckerController = require('./task-remote-checker')

const CreateTaskRewardSchemeEvent = require('../events/create-task-reward-scheme')
const CreateTaskValueEvent = require('../events/create-task-value')
const UpdateTaskRewardSchemeEvent = require('../events/update-task-reward-scheme')

const RevealTaskValueEvent = require('../events/reveal-task-value')
const RevealTaskRewardSchemeEvent = require('../events/reveal-task-reward-scheme')

const taskValueController = require('./task-value')
const taskRewardSchemeController = require('./task-reward-scheme')

const queue = require('../utils/queue')
const request = require('request')

function isTaskRemoteCheckerUniqueConstraintViolation (err) {
  return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'task_remote_checkers_ndx_remote_checker_unique')
}

class TaskController {
  static isTaskTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'tasks_ndx_title_unique')
  }

  static create (options, callback) {
    const now = new Date()
    let task = null
    let taskValue = null
    let taskRewardScheme = null
    let taskCategories = null
    let taskRemoteChecker = null

    transaction(Task, TaskValue, TaskRewardScheme, TaskCategory, TaskAnswer, TaskHint, TaskRemoteChecker, function (Task, TaskValue, TaskRewardScheme, TaskCategory, TaskAnswer, TaskHint, TaskRemoteChecker) {
      return Task
      .query()
      .insert({
        title: options.title,
        description: options.description,
        createdAt: now,
        updatedAt: now,
        value: options.value,
        state: TASK_INITIAL
      })
      .then(function (newTask) {
        task = newTask
        return TaskRewardScheme
        .query()
        .insert({
          taskId: task.id,
          maxValue: options.maxValue,
          minValue: options.minValue,
          subtractPoints: options.subtractPoints,
          subtractHitCount: options.subtractHitCount,
          created: now,
          updated: now
        })
        .then(function (newTaskRewardScheme) {
          taskRewardScheme = newTaskRewardScheme
          return TaskValue
          .query()
          .insert({
            taskId: task.id,
            value: options.maxValue,
            created: now,
            updated: now
          })
          .then(function (newTaskValue) {
            taskValue = newTaskValue
            return TaskCategory
            .query()
            .insert(options.categories.map(function (categoryId) {
              return {
                taskId: task.id,
                categoryId: categoryId,
                createdAt: now
              }
            }))
            .then(function (newTaskCategories) {
              taskCategories = newTaskCategories
              return TaskHint
              .query()
              .insert(options.hints.map(function (hint) {
                return {
                  taskId: task.id,
                  hint: hint,
                  createdAt: now
                }
              }))
              .then(function (newTaskHints) {
                if (options.checkMethod === 'list') {
                  return TaskAnswer
                  .query()
                  .insert(options.answers.map(function (entry) {
                    return {
                      taskId: task.id,
                      answer: entry.answer,
                      caseSensitive: entry.caseSensitive,
                      createdAt: now
                    }
                  }))
                } else if (options.checkMethod === 'remote') {
                  return TaskRemoteChecker
                  .query()
                  .insert({
                    taskId: task.id,
                    remoteCheckerId: options.remoteChecker,
                    createdAt: now
                  })
                  .then(function (newTaskRemoteChecker) {
                    taskRemoteChecker = newTaskRemoteChecker
                  })
                } else {
                  throw new InternalError()
                }
              })
            })
          })
        })
      })
    })
    .then(function () {
      EventController.push(new CreateTaskEvent(task))
      EventController.push(new CreateTaskValueEvent(taskValue))
      EventController.push(new CreateTaskRewardSchemeEvent(taskRewardScheme))
      for (const taskCategory of taskCategories) {
        EventController.push(new CreateTaskCategoryEvent(task, taskCategory))
      }
      if (options.checkMethod === 'remote' && taskRemoteChecker) {
        EventController.push(new CreateTaskRemoteCheckerEvent(taskRemoteChecker))
      }
      callback(null, task)
    })
    .catch(function (err) {
      if (TaskController.isTaskTitleUniqueConstraintViolation(err)) {
        callback(new DuplicateTaskTitleError(), null)
      } else if (isTaskRemoteCheckerUniqueConstraintViolation(err)) {
        callback(new RemoteCheckerAttachedError(), null)
      } else {
        logger.error(err)
        callback(new InternalError(), null)
      }
    })
  }

  static update (task, options, callback) {
    let updatedTask = null
    let updatedTaskRewardScheme = null
    let deletedTaskCategories = null
    let createdTaskCategories = null
    let hintNotification = false

    transaction(Task, TaskCategory, TaskRewardScheme, TaskAnswer, TaskHint, function (Task, TaskCategory, TaskRewardScheme, TaskAnswer, TaskHint) {
      const now = new Date()
      return Task
      .query()
      .patchAndFetchById(task.id, {
        description: options.description,
        updatedAt: now
      })
      .then(function (updatedTaskObject) {
        updatedTask = updatedTaskObject

        return TaskRewardScheme
        .query()
        .update({
          maxValue: options.maxValue,
          minValue: options.minValue,
          subtractPoints: options.subtractPoints,
          subtractHitCount: options.subtractHitCount,
          updated: now
        })
        .where('taskId', task.id)
        .returning('*')
        .then(function (updatedTaskRewardSchemes) {
          if (updatedTaskRewardSchemes.length === 1) {
            updatedTaskRewardScheme = updatedTaskRewardSchemes[0]
          }
          return TaskCategory
          .query()
          .delete()
          .whereNotIn('categoryId', options.categories)
          .andWhere('taskId', task.id)
          .returning('*')
          .then(function (deletedTaskCategoryObjects) {
            deletedTaskCategories = deletedTaskCategoryObjects

            const valuePlaceholderExpressions = _.times(options.categories.length, function () {
              return '(?, ?, ?)'
            })

            const values = options.categories.map(function (categoryId) {
              return [
                task.id,
                categoryId,
                now
              ]
            })

            return TaskCategory
            .raw(
              `INSERT INTO task_categories ("taskId", "categoryId", "createdAt")
              VALUES ${valuePlaceholderExpressions.join(', ')}
              ON CONFLICT ("taskId", "categoryId") DO NOTHING
              RETURNING *`,
              _.flatten(values)
            )
            .then(function (response) {
              createdTaskCategories = response.rows
              return TaskHint
              .query()
              .insert(options.hints.map(function (hint) {
                return {
                  taskId: task.id,
                  hint: hint,
                  createdAt: now
                }
              }))
              .then(function (newTaskHints) {
                if (newTaskHints.length > 0) {
                  hintNotification = true
                }
                if (options.checkMethod === 'list') {
                  return TaskAnswer
                  .query()
                  .insert(options.answers.map(function (entry) {
                    return {
                      taskId: task.id,
                      answer: entry.answer,
                      caseSensitive: entry.caseSensitive,
                      createdAt: now
                    }
                  }))
                }
              })
            })
          })
        })
      })
    })
    .then(function () {
      if (hintNotification) {
        queue('notifyTaskHint').add({ taskId: updatedTask.id })
      }
      EventController.push(new UpdateTaskEvent(updatedTask))
      if (updatedTaskRewardScheme) {
        EventController.push(new UpdateTaskRewardSchemeEvent(updatedTask, updatedTaskRewardScheme))
      }
      for (const taskCategory of deletedTaskCategories) {
        EventController.push(new DeleteTaskCategoryEvent(updatedTask, taskCategory))
      }

      for (const taskCategory of createdTaskCategories) {
        EventController.push(new CreateTaskCategoryEvent(updatedTask, taskCategory))
      }

      callback(null, updatedTask)
    })
    .catch(function (err) {
      logger.error(err)
      callback(new InternalError(), null)
    })
  }

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
          resolve(tasks)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  static index (callback, filterNew = false) {
    let taskPromise = Task.query()
    if (filterNew) {
      taskPromise = taskPromise
        .where('state', TASK_OPENED)
        .orWhere('state', TASK_CLOSED)
    }

    taskPromise
      .then(function (tasks) {
        callback(null, tasks)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static checkAnswer (task, proposedAnswer, callback) {
    TaskAnswerController.listByTask(task.id, function (err, taskAnswers) {
      if (err) {
        callback(err, null)
      } else {
        if (taskAnswers.length === 0) {
          taskRemoteCheckerController
          .getByTaskId(task.id)
          .then(function (taskRemoteChecker) {
            return remoteCheckerController.get(taskRemoteChecker.remoteCheckerId)
          })
          .then(function (remoteChecker) {
            request({
              method: 'POST',
              url: remoteChecker.url,
              body: {
                answer: proposedAnswer
              },
              auth: {
                user: remoteChecker.authUsername,
                pass: remoteChecker.authPassword
              },
              json: true,
              timeout: 10000
            }, function (err3, response, body) {
              if (err3) {
                logger.error(err3)
                callback(new RemoteCheckerUnavailableError(), null)
              } else {
                if (response.statusCode === 200 && body.hasOwnProperty('result')) {
                  callback(null, body.result)
                } else {
                  logger.error(response)
                  callback(new RemoteCheckerUnavailableError(), null)
                }
              }
            })
          })
          .catch(function (err2) {
            callback(err2, null)
          })
        } else {
          let answerCorrect = false
          for (const entry of taskAnswers) {
            if (entry.caseSensitive) {
              answerCorrect = (proposedAnswer === entry.answer)
            } else {
              answerCorrect = (proposedAnswer.toLowerCase() === entry.answer.toLowerCase())
            }
            if (answerCorrect) {
              break
            }
          }

          callback(null, answerCorrect)
        }
      }
    })
  }

  static getTaskLink (taskId) {
    const prefix = (process.env.THEMIS_QUALS_SECURE === 'yes') ? 'https' : 'http'
    const fqdn = process.env.THEMIS_QUALS_FQDN
    return `${prefix}://${fqdn}/tasks?action=show&taskId=${taskId}`
  }

  static constructEventsOnOpen (task) {
    return new Promise(function (resolve, reject) {
      Promise
      .all([
        TaskCategoryController.fetchByTask(task.id),
        taskValueController.getByTaskId(task.id),
        taskRewardSchemeController.getByTaskId(task.id)
      ])
      .then(function (values) {
        const eventList = []
        eventList.push(new OpenTaskEvent(task))
        _.each(values[0], function (taskCategory) {
          eventList.push(new RevealTaskCategoryEvent(taskCategory))
        })
        eventList.push(new RevealTaskValueEvent(values[1]))
        eventList.push(new RevealTaskRewardSchemeEvent(values[2]))
        resolve(eventList)
      })
      .catch(function (err) {
        reject(err)
      })
    })
  }

  static open (task, callback) {
    if (task.isInitial()) {
      Task
      .query()
      .patchAndFetchById(task.id, {
        state: TASK_OPENED,
        updatedAt: new Date()
      })
      .then(function (updatedTask) {
        TaskController.constructEventsOnOpen(updatedTask)
        .then(function (eventList) {
          _.each(eventList, function (eventObj) {
            EventController.push(eventObj)
          })

          queue('notifyOpenTask').add({
            taskId: updatedTask.id
          })

          callback(null)
        })
        .catch(function (err2) {
          logger.error(err2)
          callback(new InternalError())
        })
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError())
      })
    } else {
      if (task.isOpened()) {
        callback(new TaskAlreadyOpenedError())
      } else if (task.isClosed()) {
        callback(new TaskClosedError())
      } else {
        callback(new InternalError())
      }
    }
  }

  static close (task, callback) {
    if (task.isOpened()) {
      Task
        .query()
        .patchAndFetchById(task.id, {
          state: TASK_CLOSED,
          updatedAt: new Date()
        })
        .then(function (updatedTask) {
          callback(null)
          EventController.push(new CloseTaskEvent(updatedTask))
        })
        .catch(function (err) {
          logger.error(err)
          callback(new InternalError())
        })
    } else {
      if (task.isInitial()) {
        callback(new TaskNotOpenedError())
      } else if (task.isClosed()) {
        callback(new TaskAlreadyClosedError())
      } else {
        callback(new InternalError())
      }
    }
  }

  static fetchOne (id) {
    return new Promise(function (resolve, reject) {
      Task
      .query()
      .where('id', id)
      .first()
      .then(function (task) {
        if (task) {
          resolve(task)
        } else {
          reject(new TaskNotFoundError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
    })
  }

  static get (id, callback) {
    Task
      .query()
      .where('id', id)
      .first()
      .then(function (task) {
        if (task) {
          callback(null, task)
        } else {
          callback(new TaskNotFoundError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = TaskController
