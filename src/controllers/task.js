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
const {
  InternalError, DuplicateTaskTitleError, TaskAlreadyOpenedError, TaskClosedError, TaskNotOpenedError,
  TaskAlreadyClosedError, TaskNotFoundError, RemoteCheckerAttachedError, RemoteCheckerUnavailableError
} = require('../utils/errors')
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

const async = require('async')
const tmp = require('tmp')
const fs = require('fs')
const githubController = require('./github')
const YAML = require('yaml')
const when_ = require('when')
const taskFileController = require('./task-file')

function isTaskRemoteCheckerUniqueConstraintViolation (err) {
  return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'task_remote_checkers_ndx_remote_checker_unique')
}

const scoringDynlog = {
  min: parseInt(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_MIN, 10),
  max: parseInt(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_MAX, 10),
  k: parseFloat(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_K).toFixed(4),
  v: parseFloat(process.env.VOLGACTF_QUALIFIER_SCORING_DYNLOG_V).toFixed(4)
}

class TaskController {
  static isTaskTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'tasks_ndx_title_unique')
  }

  static loadFromGitHub (repository) {
    return new Promise(function (resolve, reject) {
      tmp.dir(function (err, path, cleanupCallback) {
        if (err) {
          logger.error('Failed to create temporary directory')
          reject(new InternalError())
        }
        const clonePath = `${path}/repo`

        githubController
          .cloneRepository(repository, clonePath)
          .then(function () {
            const taskConfigPath = `${clonePath}/task.yaml`

            if (fs.existsSync(taskConfigPath)) {
              const taskConfig = YAML.parse(fs.readFileSync(taskConfigPath, 'utf8'))
              resolve(taskConfig)
            } else {
              reject(new Error(`Could not find task.yaml file inside ${repository}`))
            }
          })
          .catch(function (err) {
            logger.error(err)
            reject(err)
          })
          .finally(function () {
            fs.rmSync(clonePath, { recursive: true, force: true })
            cleanupCallback()
          })
      })
    })
  }

  static loadFilesFromGitHubAndUpdateDescription (task, repository) {
    return new Promise(function (resolve, reject) {
      const fileRefRegexp = /\[([\w\d \.\-_]+)\]\(([\w\d \.\-_/]+)\)/gm
      const matches = task.description.match(fileRefRegexp) || []

      if (matches.length === 0) {
        resolve(task)
      } else {
        tmp.dir(function (err, path, cleanupCallback) {
          if (err) {
            logger.error('Failed to create temporary directory')
            reject(new InternalError())
          }
          const clonePath = `${path}/repo`

          githubController
            .cloneRepository(repository, clonePath)
            .then(function () {
              const resolveFile = function (name, url) {
                return new Promise(function (_resolve, _reject) {
                  taskFileController
                    .create(task.id, `${clonePath}/${url}`, name)
                    .then(function (taskFile) {
                      _resolve({
                        name,
                        url,
                        updatedUrl: `${(process.env.VOLGACTF_QUALIFIER_SECURE === 'yes') ? 'https' : 'http'}://${process.env.VOLGACTF_QUALIFIER_FQDN}/files/${taskFile.prefix}/${taskFile.filename}`
                      })
                    })
                    .catch(function (err) {
                      logger.error(err)
                      _resolve(null)
                    })
                })
              }

              const fileResolvers = []
              for (const match of task.description.matchAll(fileRefRegexp)) {
                if (!match[2].startsWith('http') && fs.existsSync(`${clonePath}/${match[2]}`)) {
                  fileResolvers.push(resolveFile(match[1], match[2]))
                }
              }

              return when_.all(fileResolvers)
            })
            .then(function (fileResolved) {
              const fileResolvedNonNull = _.filter(fileResolved || [], function (item) {
                return item !== null
              })

              const updatedDescription = task.description.replace(fileRefRegexp, function (match, name, url) {
                const updatedItem = _.find(fileResolvedNonNull, function (item) {
                  return item.name === name && item.url === url
                })

                if (updatedItem) {
                  return `[${updatedItem.name}](${updatedItem.updatedUrl})`
                } else {
                  return match
                }
              })

              return Task
                .query()
                .update({
                  description: updatedDescription,
                  updatedAt: new Date()
                })
                .where('id', task.id)
                .andWhere('description', '!=', updatedDescription)
                .returning('*')
            })
            .then(function (updatedTasks) {
              if (updatedTasks.length === 1) {
                EventController.push(new UpdateTaskEvent(updatedTasks[0]))
                resolve(updatedTasks[0])
              } else {
                resolve(task)
              }
            })
            .catch(function (err) {
              logger.error(err)
              reject(err)
            })
            .finally(function () {
              fs.rmSync(clonePath, { recursive: true, force: true })
              cleanupCallback()
            })
        })
      }
    })
  }

  static create (options, callback) {
    const now = new Date()
    let task = null
    let taskValue = null
    let taskRewardScheme = null
    let taskCategories = null
    let taskRemoteChecker = null

    const isScoringDynlog = options.maxValue === null && options.minValue === null && options.subtractPoints === null && options.subtractHitCount === null

    transaction(Task, TaskValue, TaskRewardScheme, TaskCategory, TaskAnswer, TaskHint, TaskRemoteChecker, function (Task, TaskValue, TaskRewardScheme, TaskCategory, TaskAnswer, TaskHint, TaskRemoteChecker) {
      return Task
        .query()
        .insert({
          title: options.title,
          description: options.description,
          createdAt: now,
          updatedAt: now,
          state: TASK_INITIAL,
          openAt: options.openAt
        })
        .then(function (newTask) {
          task = newTask
          return TaskRewardScheme
            .query()
            .insert({
              taskId: task.id,
              maxValue: isScoringDynlog ? scoringDynlog.max : options.maxValue,
              minValue: isScoringDynlog ? scoringDynlog.min : options.minValue,
              subtractPoints: options.subtractPoints,
              subtractHitCount: options.subtractHitCount,
              dynlogK: isScoringDynlog ? scoringDynlog.k : null,
              dynlogV: isScoringDynlog ? scoringDynlog.v : null,
              created: now,
              updated: now
            })
            .then(function (newTaskRewardScheme) {
              taskRewardScheme = newTaskRewardScheme
              return TaskValue
                .query()
                .insert({
                  taskId: task.id,
                  value: isScoringDynlog ? scoringDynlog.max : options.maxValue,
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
                        categoryId,
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
                            hint,
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

    let flagNewAttributes = false
    let flagNewHints = false
    let flagNewAnswers = false

    transaction(Task, TaskCategory, TaskRewardScheme, TaskAnswer, TaskHint, function (Task, TaskCategory, TaskRewardScheme, TaskAnswer, TaskHint) {
      const now = new Date()
      return Task
        .query()
        .update({
          description: options.description,
          openAt: options.openAt,
          updatedAt: now
        })
        .where('id', task.id)
        .andWhere(function () {
          this
            .where('description', '!=', options.description)
            .orWhereRaw('"openAt" IS DISTINCT FROM ?', [options.openAt])
        })
        .returning('*')
        .then(function (updatedTasks) {
          if (updatedTasks.length === 1) {
            updatedTask = updatedTasks[0]
            flagNewAttributes = true
          } else {
            updatedTask = task
          }
          const isScoringDynlog = options.maxValue === null && options.minValue === null && options.subtractPoints === null && options.subtractHitCount === null
          return TaskRewardScheme
            .query()
            .update({
              maxValue: isScoringDynlog ? scoringDynlog.max : options.maxValue,
              minValue: isScoringDynlog ? scoringDynlog.min : options.minValue,
              subtractPoints: options.subtractPoints,
              subtractHitCount: options.subtractHitCount,
              dynlogK: isScoringDynlog ? scoringDynlog.k : null,
              dynlogV: isScoringDynlog ? scoringDynlog.v : null,
              updated: now
            })
            .where('taskId', updatedTask.id)
            .andWhere(function () {
              this
                .where('maxValue', '!=', isScoringDynlog ? scoringDynlog.max : options.maxValue)
                .orWhereRaw('"minValue" IS DISTINCT FROM ?', [isScoringDynlog ? scoringDynlog.min : options.minValue])
                .orWhereRaw('"subtractPoints" IS DISTINCT FROM ?', [options.subtractPoints])
                .orWhereRaw('"subtractHitCount" IS DISTINCT FROM ?', [options.subtractHitCount])
                .orWhereRaw('"dynlogK" IS DISTINCT FROM ?', [isScoringDynlog ? scoringDynlog.k : null])
                .orWhereRaw('"dynlogV" IS DISTINCT FROM ?', [isScoringDynlog ? scoringDynlog.v : null])
            })
            .returning('*')
            .then(function (updatedTaskRewardSchemes) {
              if (updatedTaskRewardSchemes.length === 1) {
                updatedTaskRewardScheme = updatedTaskRewardSchemes[0]
              }
              return TaskCategory
                .query()
                .delete()
                .whereNotIn('categoryId', options.categories)
                .andWhere('taskId', updatedTask.id)
                .returning('*')
                .then(function (deletedTaskCategoryObjects) {
                  deletedTaskCategories = deletedTaskCategoryObjects

                  const valuePlaceholderExpressions = _.times(options.categories.length, function () {
                    return '(?, ?, ?)'
                  })

                  const values = options.categories.map(function (categoryId) {
                    return [
                      updatedTask.id,
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
                            taskId: updatedTask.id,
                            hint,
                            createdAt: now
                          }
                        }))
                        .then(function (newTaskHints) {
                          if (newTaskHints.length > 0) {
                            flagNewHints = true
                          }
                          if (options.checkMethod === 'list') {
                            return TaskAnswer
                              .query()
                              .insert(options.answers.map(function (entry) {
                                return {
                                  taskId: updatedTask.id,
                                  answer: entry.answer,
                                  caseSensitive: entry.caseSensitive,
                                  createdAt: now
                                }
                              }))
                              .then(function (newTaskAnswers) {
                                if (newTaskAnswers.length > 0) {
                                  flagNewAnswers = true
                                }
                              })
                          }
                        })
                    })
                })
            })
        })
    })
      .then(function () {
        if (flagNewHints) {
          queue('notifyTaskHint').add({ taskId: updatedTask.id })
        }
        if (flagNewAttributes || flagNewHints || flagNewAnswers) {
          EventController.push(new UpdateTaskEvent(updatedTask))
        }

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
                  if (response.statusCode === 200 && Object.hasOwn(body, 'result')) {
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
    const prefix = (process.env.VOLGACTF_QUALIFIER_SECURE === 'yes') ? 'https' : 'http'
    const fqdn = process.env.VOLGACTF_QUALIFIER_FQDN
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
          TaskController
            .constructEventsOnOpen(updatedTask)
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

  static internalOpen (task, next) {
    TaskController.open(task, function (err) {
      if (err) {
        next(err, null)
      } else {
        next(null, null)
      }
    })
  }

  static checkUnopened () {
    return new Promise(function (resolve, reject) {
      const now = new Date()
      Task
        .query()
        .where('state', TASK_INITIAL)
        .whereNotNull('openAt')
        .andWhere('openAt', '<', now)
        .then(function (tasks) {
          async.mapLimit(tasks, 2, TaskController.internalOpen, function (err2, results) {
            if (err2) {
              logger.error(err2)
              reject(err2)
            } else {
              resolve()
            }
          })
        })
        .catch(function (err) {
          logger.error(err)
          reject(err)
        })
    })
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
