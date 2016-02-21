import Task from '../models/task'
import TaskCategory from '../models/task-category'
import TaskAnswer from '../models/task-answer'

import TaskAnswerController from './task-answer'

import logger from '../utils/logger'
import { InternalError, DuplicateTaskTitleError, TaskAlreadyOpenedError, TaskClosedError, TaskNotOpenedError, TaskAlreadyClosedError, TaskNotFoundError } from '../utils/errors'
import constants from '../utils/constants'
import publish from '../utils/publisher'

import _ from 'underscore'
import { transaction } from 'objection'
import BaseEvent from '../utils/events'

import taskSerializer from '../serializers/task'
import taskCategorySerializer from '../serializers/task-category'

class CreateTaskEvent extends BaseEvent {
  constructor (task) {
    super('createTask')
    let taskData = taskSerializer(task, { preview: true })
    this.data.supervisors = taskData
  }
}

class CreateTaskCategoryEvent extends BaseEvent {
  constructor (taskCategory) {
    super('createTaskCategory')
    let taskCategoryData = taskCategorySerializer(taskCategory)
    this.data.supervisors = taskCategoryData
    this.data.teams = taskCategoryData
    this.data.guests = taskCategoryData
  }
}

class RemoveTaskCategoryEvent extends BaseEvent {
  constructor (taskCategoryId) {
    super('removeTaskCategory')
    let taskCategoryData = { id: taskCategoryId }
    this.data.supervisors = taskCategoryData
    this.data.teams = taskCategoryData
    this.data.guests = taskCategoryData
  }
}

class UpdateTaskEvent extends BaseEvent {
  constructor (task) {
    super('updateTask')
    let taskData = taskSerializer(task, { preview: true })
    this.data.supervisors = taskData
    if (!task.isInitial()) {
      this.data.teams = taskData
      this.data.guests = taskData
    }
  }
}

class OpenTaskEvent extends BaseEvent {
  constructor (task) {
    super('openTask')
    let taskData = taskSerializer(task, { preview: true })
    this.data.supervisors = taskData
    this.data.teams = taskData
    this.data.guests = taskData
  }
}

class CloseTaskEvent extends BaseEvent {
  constructor (task) {
    super('closeTask')
    let taskData = taskSerializer(task, { preview: true })
    this.data.supervisors = taskData
    this.data.teams = taskData
    this.data.guests = taskData
  }
}

class TaskController {
  static isTaskTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'tasks_ndx_title_unique')
  }

  static create (options, callback) {
    let now = new Date()
    let task = null
    let taskCategories = null

    transaction(Task, TaskCategory, TaskAnswer, (Task, TaskCategory, TaskAnswer) => {
      return Task
        .query()
        .insert({
          title: options.title,
          description: options.description,
          createdAt: now,
          updatedAt: now,
          hints: JSON.stringify(options.hints),
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
                })
            })
        })
    })
    .then(() => {
      callback(null, task)
      publish('realtime', new CreateTaskEvent(task))
      // TODO: take scope into account
      for (let taskCategory of taskCategories) {
        publish('realtime', new CreateTaskCategoryEvent(taskCategory))
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
    let deletedTaskCategoryIds = null
    let createdTaskCategories = null

    transaction(Task, TaskCategory, TaskAnswer, (Task, TaskCategory, TaskAnswer) => {
      let now = new Date()
      return Task
        .query()
        .patchAndFetchById(task.id, {
          description: options.description,
          hints: JSON.stringify(options.hints),
          updatedAt: now
        })
        .then((updatedTaskObject) => {
          updatedTask = updatedTaskObject
          return TaskCategory
            .query()
            .delete()
            .whereNotIn('categoryId', options.categories)
            .andWhere('taskId', task.id)
            .returning('id')
            .then((deletedTaskCategoryIdObjects) => {
              deletedTaskCategoryIds = deletedTaskCategoryIdObjects

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
                    })
                })
            })
        })
    })
    .then(() => {
      callback(null, updatedTask)
      publish('realtime', new UpdateTaskEvent(updatedTask))

      // TODO: take scope into account
      for (let taskCategoryId of deletedTaskCategoryIds) {
        publish('realtime', new RemoveTaskCategoryEvent(taskCategoryId))
      }

      for (let taskCategory of createdTaskCategories) {
        publish('realtime', new CreateTaskCategoryEvent(taskCategory))
      }
    })
    .catch((err) => {
      logger.error(err)
      callback(new InternalError(), null)
    })
  }

  static list (callback) {
    Task
      .query()
      .then((tasks) => {
        callback(null, tasks)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static listEligible (callback) {
    Task
      .query()
      .where('state', constants.TASK_OPENED)
      .orWhere('state', constants.TASK_CLOSED)
      .then((tasks) => {
        callback(null, tasks)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static checkAnswer (task, proposedAnswer, callback) {
    if (!task.caseSensitive) {
      proposedAnswer = proposedAnswer.toLowerCase()
    }

    TaskAnswerController.listByTask(task.id, (err, taskAnswers) => {
      if (err) {
        callback(err, null)
      } else {
        let answerCorrect = false
        for (let entry of taskAnswers) {
          if (entry.caseSensitive) {
            answerCorrect = (proposedAnswer === entry.answer)
          } else {
            answerCorrect = (proposedAnswer === entry.answer.toLowerCase())
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
          publish('realtime', new OpenTaskEvent(updatedTask))
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
          publish('realtime', new CloseTaskEvent(updatedTask))
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
