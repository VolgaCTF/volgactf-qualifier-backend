import TaskCategory from '../models/task-category'
import { InternalError, TaskCategoryNotFoundError, DuplicateTaskCategoryTitleError, TaskCategoryAttachedError } from '../utils/errors'
import taskCategorySerializer from '../serializers/task-category'
import publish from '../utils/publisher'

import BaseEvent from '../utils/events'
import TaskController from './task'
import logger from '../utils/logger'


class CreateTaskCategoryEvent extends BaseEvent {
  constructor(taskCategory) {
    super('createTaskCategory')
    let taskCategoryData = taskCategorySerializer(taskCategory)
    this.data.supervisors = taskCategoryData
    this.data.teams = taskCategoryData
    this.data.guests = taskCategoryData
  }
}


class UpdateTaskCategoryEvent extends BaseEvent {
  constructor(taskCategory) {
    super('updateTaskCategory')
    let taskCategoryData = taskCategorySerializer(taskCategory)
    this.data.supervisors = taskCategoryData
    this.data.teams = taskCategoryData
    this.data.guests = taskCategoryData
  }
}


class RemoveTaskCategoryEvent extends BaseEvent {
  constructor(taskCategoryId) {
    super('removeTaskCategory')
    let taskCategoryData = { id: taskCategoryId }
    this.data.supervisors = taskCategoryData
    this.data.teams = taskCategoryData
    this.data.guests = taskCategoryData
  }
}


class TaskCategoryController {
  static list(callback) {
    TaskCategory
      .query()
      .then((taskCategories) => {
        callback(null, taskCategories)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError, null)
      })
  }

  static get(id, callback) {
    TaskCategory
      .query()
      .where('id', id)
      .first()
      .then((taskCategory) => {
        if (taskCategory) {
          callback(null, taskCategory)
        } else {
          callback(new TaskCategoryNotFoundError(), null)
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new TaskCategoryNotFoundError(), null)
      })
  }

  static create(title, description, callback) {
    TaskCategory
      .query()
      .where('title', title)
      .first()
      .then((taskCategory) => {
        if (taskCategory) {
          callback(new DuplicateTaskCategoryTitleError(), null)
        } else {
          let now = new Date()

          TaskCategory
            .query()
            .insert({
              title: title,
              description: description,
              createdAt: now,
              updatedAt: now
            })
            .then((taskCategory) => {
              callback(null, taskCategory)
              publish('realtime', new CreateTaskCategoryEvent(taskCategory))
            })
            .catch((err) => {
              logger.error(err)
              callback(new InternalError(), null)
            })
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static update(id, title, description, callback) {
    TaskCategoryController.get(id, (err, taskCategory) => {
      if (err) {
        callback(err, null)
      } else {
        TaskCategory
          .query()
          .where('title', title)
          .first()
          .then((duplicateTaskCategory) => {
            if (duplicateTaskCategory && duplicateTaskCategory.id !== taskCategory.id) {
              callback(new DuplicateTaskCategoryTitleError(), null)
            } else {
              TaskCategory
                .query()
                .patchAndFetchById(id, {
                  title: title,
                  description: description,
                  updatedAt: new Date()
                })
                .then((updatedTaskCategory) => {
                  callback(null, updatedTaskCategory)
                  publish('realtime', new UpdateTaskCategoryEvent(updatedTaskCategory))
                })
                .catch((err) => {
                  logger.error(err)
                  callback(new InternalError(), null)
                })
            }
          })
          .catch((err) => {
            logger.error(err)
            callback(new InternalError(), null)
          })
      }
    })
  }

  static remove(id, callback) {
    TaskController.getByCategory(id, (err, tasks) => {
      if (err) {
        callback(err)
      } else {
        if (tasks.length > 0) {
          callback(new TaskCategoryAttachedError())
        } else {
          TaskCategory
            .query()
            .delete()
            .where('id', id)
            .then((numDeleted) => {
              if (numDeleted === 0) {
                callback(new TaskCategoryNotFoundError())
              } else {
                publish('realtime', new RemoveTaskCategoryEvent(id))
                callback(null)
              }
            })
            .catch((err) => {
              logger.error(err)
              callback(new TaskCategoryNotFoundError())
            })
        }
      }
    })
  }
}


export default TaskCategoryController
