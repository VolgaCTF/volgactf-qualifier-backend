import Task from '../models/task'
import TaskCategory from '../models/task-category'
import TaskAnswer from '../models/task-answer'
import TaskHint from '../models/task-hint'

import TaskAnswerController from './task-answer'
import TaskCategoryController from './task-category'

import logger from '../utils/logger'
import { InternalError, DuplicateTaskTitleError, TaskAlreadyOpenedError, TaskClosedError, TaskNotOpenedError, TaskAlreadyClosedError, TaskNotFoundError } from '../utils/errors'
import constants from '../utils/constants'

import _ from 'underscore'
import { transaction } from 'objection'

import EventController from './event'
import CreateTaskEvent from '../events/create-task'
import UpdateTaskEvent from '../events/update-task'
import OpenTaskEvent from '../events/open-task'
import CloseTaskEvent from '../events/close-task'
import CreateTaskCategoryEvent from '../events/create-task-category'
import DeleteTaskCategoryEvent from '../events/delete-task-category'
import RevealTaskCategoryEvent from '../events/reveal-task-category'

class TaskController {
  static isTaskTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'tasks_ndx_title_unique')
  }

  static create (options, callback) {
    let now = new Date()
    let task = null
    let taskCategories = null

    transaction(Task, TaskCategory, TaskAnswer, TaskHint, (Task, TaskCategory, TaskAnswer, TaskHint) => {
      return Task
        .query()
        .insert({
          title: options.title,
          description: options.description,
          createdAt: now,
          updatedAt: now,
          value: options.value,
          state: constants.TASK_INITIAL
        })
        .then((newTask) => {
          task = newTask
          return TaskCategory
            .query()
            .insert(options.categories.map((categoryId) => {
              return {
                taskId: task.id,
                categoryId: categoryId,
                createdAt: now
              }
            }))
            .then((newTaskCategories) => {
              taskCategories = newTaskCategories
              return TaskAnswer
                .query()
                .insert(options.answers.map((entry) => {
                  return {
                    taskId: task.id,
                    answer: entry.answer,
                    caseSensitive: entry.caseSensitive,
                    createdAt: now
                  }
                }))
                .then((newTaskAnswers) => {
                  return TaskHint
                    .query()
                    .insert(options.hints.map((hint) => {
                      return {
                        taskId: task.id,
                        hint: hint,
                        createdAt: now
                      }
                    }))
                    .then((newTaskHints) => {
                    })
                })
            })
        })
    })
    .then(() => {
      callback(null, task)
      EventController.push(new CreateTaskEvent(task))
      for (let taskCategory of taskCategories) {
        EventController.push(new CreateTaskCategoryEvent(task, taskCategory))
      }
    })
    .catch((err) => {
      if (this.isTaskTitleUniqueConstraintViolation(err)) {
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

    transaction(Task, TaskCategory, TaskAnswer, TaskHint, (Task, TaskCategory, TaskAnswer, TaskHint) => {
      let now = new Date()
      return Task
        .query()
        .patchAndFetchById(task.id, {
          description: options.description,
          updatedAt: now
        })
        .then((updatedTaskObject) => {
          updatedTask = updatedTaskObject
          return TaskCategory
            .query()
            .delete()
            .whereNotIn('categoryId', options.categories)
            .andWhere('taskId', task.id)
            .returning('*')
            .then((deletedTaskCategoryObjects) => {
              deletedTaskCategories = deletedTaskCategoryObjects

              let valuePlaceholderExpressions = _.times(options.categories.length, () => {
                return '(?, ?, ?)'
              })

              let values = options.categories.map((categoryId) => {
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
                .then((response) => {
                  createdTaskCategories = response.rows
                  return TaskAnswer
                    .query()
                    .insert(options.answers.map((entry) => {
                      return {
                        taskId: task.id,
                        answer: entry.answer,
                        caseSensitive: entry.caseSensitive,
                        createdAt: now
                      }
                    }))
                    .then((newTaskAnswers) => {
                      return TaskHint
                        .query()
                        .insert(options.hints.map((hint) => {
                          return {
                            taskId: task.id,
                            hint: hint,
                            createdAt: now
                          }
                        }))
                        .then((newTaskHints) => {
                        })
                    })
                })
            })
        })
    })
    .then(() => {
      callback(null, updatedTask)
      EventController.push(new UpdateTaskEvent(updatedTask))

      for (let taskCategory of deletedTaskCategories) {
        EventController.push(new DeleteTaskCategoryEvent(updatedTask, taskCategory))
      }

      for (let taskCategory of createdTaskCategories) {
        EventController.push(new CreateTaskCategoryEvent(updatedTask, taskCategory))
      }
    })
    .catch((err) => {
      logger.error(err)
      callback(new InternalError(), null)
    })
  }

  static index (callback, filterNew = false) {
    let taskPromise = Task.query()
    if (filterNew) {
      taskPromise = taskPromise
        .where('state', constants.TASK_OPENED)
        .orWhere('state', constants.TASK_CLOSED)
    }

    taskPromise
      .then((tasks) => {
        callback(null, tasks)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static checkAnswer (task, proposedAnswer, callback) {
    TaskAnswerController.listByTask(task.id, (err, taskAnswers) => {
      if (err) {
        callback(err, null)
      } else {
        let answerCorrect = false
        for (let entry of taskAnswers) {
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

  static open (task, callback) {
    if (task.isInitial()) {
      Task
        .query()
        .patchAndFetchById(task.id, {
          state: constants.TASK_OPENED,
          updatedAt: new Date()
        })
        .then((updatedTask) => {
          callback(null)
          EventController.push(new OpenTaskEvent(updatedTask))
          TaskCategoryController.indexByTask(updatedTask.id, (err, taskCategories) => {
            if (err) {
              logger.error(err)
              callback(new InternalError())
            } else {
              for (let taskCategory of taskCategories) {
                EventController.push(new RevealTaskCategoryEvent(taskCategory))
              }
            }
          })
        })
        .catch((err) => {
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
          state: constants.TASK_CLOSED,
          updatedAt: new Date()
        })
        .then((updatedTask) => {
          callback(null)
          EventController.push(new CloseTaskEvent(updatedTask))
        })
        .catch((err) => {
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
      .then((task) => {
        if (task) {
          callback(null, task)
        } else {
          callback(new TaskNotFoundError())
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TaskController
