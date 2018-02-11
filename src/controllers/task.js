const Task = require('../models/task')
const TaskCategory = require('../models/task-category')
const TaskAnswer = require('../models/task-answer')
const TaskHint = require('../models/task-hint')

const TaskAnswerController = require('./task-answer')
const TaskCategoryController = require('./task-category')

const logger = require('../utils/logger')
const { InternalError, DuplicateTaskTitleError, TaskAlreadyOpenedError, TaskClosedError, TaskNotOpenedError,
  TaskAlreadyClosedError, TaskNotFoundError } = require('../utils/errors')
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

const queue = require('../utils/queue')

class TaskController {
  static isTaskTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'tasks_ndx_title_unique')
  }

  static create (options, callback) {
    const now = new Date()
    let task = null
    let taskCategories = null

    transaction(Task, TaskCategory, TaskAnswer, TaskHint, function (Task, TaskCategory, TaskAnswer, TaskHint) {
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
                .then(function (newTaskAnswers) {
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
                    })
                })
            })
        })
    })
    .then(function () {
      callback(null, task)
      EventController.push(new CreateTaskEvent(task))
      for (const taskCategory of taskCategories) {
        EventController.push(new CreateTaskCategoryEvent(task, taskCategory))
      }
    })
    .catch(function (err) {
      if (TaskController.isTaskTitleUniqueConstraintViolation(err)) {
        callback(new DuplicateTaskTitleError(), null)
      } else {
        logger.error(err)
        callback(new InternalError(), null)
      }
    })
  }

  static update (task, options, callback) {
    let updatedTask = null
    let deletedTaskCategories = null
    let createdTaskCategories = null

    transaction(Task, TaskCategory, TaskAnswer, TaskHint, function (Task, TaskCategory, TaskAnswer, TaskHint) {
      const now = new Date()
      return Task
        .query()
        .patchAndFetchById(task.id, {
          description: options.description,
          updatedAt: now
        })
        .then(function (updatedTaskObject) {
          updatedTask = updatedTaskObject
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
                    .then(function (newTaskAnswers) {
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
                            queue('notifyTaskHint').add({ taskId: task.id })
                          }
                        })
                    })
                })
            })
        })
    })
    .then(function () {
      callback(null, updatedTask)
      EventController.push(new UpdateTaskEvent(updatedTask))

      for (const taskCategory of deletedTaskCategories) {
        EventController.push(new DeleteTaskCategoryEvent(updatedTask, taskCategory))
      }

      for (const taskCategory of createdTaskCategories) {
        EventController.push(new CreateTaskCategoryEvent(updatedTask, taskCategory))
      }
    })
    .catch(function (err) {
      logger.error(err)
      callback(new InternalError(), null)
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
    })
  }

  static getTaskLink (taskId) {
    const prefix = (process.env.THEMIS_QUALS_SECURE === 'yes') ? 'https' : 'http'
    const fqdn = process.env.THEMIS_QUALS_FQDN
    return `${prefix}://${fqdn}/tasks?action=show&taskId=${taskId}`
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
          callback(null)
          EventController.push(new OpenTaskEvent(updatedTask))
          TaskCategoryController.indexByTask(updatedTask.id, function (err, taskCategories) {
            if (err) {
              logger.error(err)
              callback(new InternalError())
            } else {
              for (const taskCategory of taskCategories) {
                EventController.push(new RevealTaskCategoryEvent(taskCategory))
              }
            }
          })

          queue('notifyOpenTask').add({
            taskId: updatedTask.id
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
