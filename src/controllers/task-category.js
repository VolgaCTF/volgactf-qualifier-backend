import TaskCategory from '../models/task-category'
import { InternalError, TaskCategoryNotFoundError, DuplicateTaskCategoryTitleError, TaskCategoryAttachedError } from '../utils/errors'
import taskCategorySerializer from '../serializers/task-category'
import publish from '../utils/publisher'

import BaseEvent from '../utils/events'
import TaskController from './task'


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
    TaskCategory.find((err, taskCategories) => {
      if (err) {
        logger.error(err)
        callback(new InternalError(), null)
      } else {
        callback(null, taskCategories)
      }
    })
  }

  static get(id, callback) {
    TaskCategory.findOne({ _id: id }, (err, taskCategory) => {
      if (err) {
        logger.error(err)
        callback(new TaskCategoryNotFoundError(), null)
      } else {
        if (taskCategory) {
          callback(null, taskCategory)
        } else {
          callback(new TaskCategoryNotFoundError(), null)
        }
      }
    })
  }

  static create(title, description, callback) {
    TaskCategory.find({ title: title }).count((err, count) => {
      if (err) {
        logger.error(err)
        callback(new InternalError(), null)
      } else {
        if (count > 0) {
          callback(new DuplicateTaskCategoryTitleError(), null)
        } else {
          let now = new Date()
          let taskCategory = new TaskCategory({
            title: title,
            description: description,
            createdAt: now,
            updatedAt: now
          })

          taskCategory.save((err, taskCategory) => {
            if (err) {
              logger.error(err)
              callback(new InternalError(), null)
            } else {
              callback(null, taskCategory)
              publish('realtime', new CreateTaskCategoryEvent(taskCategory))
            }
          })
        }
      }
    })
  }

  static update(id, title, description, callback) {
    TaskCategoryController.get(id, (err, taskCategory) => {
      if (err) {
        callback(err, null)
      } else {
        TaskCategory.find({ title: title }).count((err, count) => {
          if (err) {
            logger.error(err)
            callback(new InternalError(), null)
          } else {
            if (count > 0 && title !== taskCategory.title) {
              callback(new DuplicateTaskCategoryTitleError(), null)
            } else {
              taskCategory.title = title
              taskCategory.description = description
              taskCategory.updatedAt = new Date()
              taskCategory.save((err, taskCategory) => {
                if (err) {
                  logger.error(err)
                  callback(new InternalError(), null)
                } else {
                  callback(null, taskCategory)
                  publish('realtime', new UpdateTaskCategoryEvent(taskCategory))
                }
              })
            }
          }
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
          TaskCategory.remove({ _id: id }, (err) => {
            if (err) {
              callback(new TaskCategoryNotFoundError())
            } else {
              callback(null)
              publish('realtime', new RemoveTaskCategoryEvent(id))
            }
          })
        }
      }
    })
  }
}


export default TaskCategoryController
