TaskCategory = require '../models/task-category'
errors = require '../utils/errors'
taskCategorySerializer = require '../serializers/task-category'
publisher = require '../utils/publisher'

BaseEvent = require('../utils/events').BaseEvent
TaskController = require './task'


class CreateTaskCategoryEvent extends BaseEvent
    constructor: (taskCategory) ->
        super 'createTaskCategory'
        taskCategoryData = taskCategorySerializer taskCategory
        @data.supervisors = taskCategoryData
        @data.teams = taskCategoryData
        @data.guests = taskCategoryData


class UpdateTaskCategoryEvent extends BaseEvent
    constructor: (taskCategory) ->
        super 'updateTaskCategory'
        taskCategoryData = taskCategorySerializer taskCategory
        @data.supervisors = taskCategoryData
        @data.teams = taskCategoryData
        @data.guests = taskCategoryData


class RemoveTaskCategoryEvent extends BaseEvent
    constructor: (taskCategoryId) ->
        super 'removeTaskCategory'
        taskCategoryData = id: taskCategoryId
        @data.supervisors = taskCategoryData
        @data.teams = taskCategoryData
        @data.guests = taskCategoryData


class TaskCategoryController
    @list: (callback) ->
        TaskCategory.find (err, taskCategories) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, taskCategories

    @get: (id, callback) ->
        TaskCategory.findOne _id: id, (err, taskCategory) ->
            if err?
                logger.error err
                callback new errors.TaskCategoryNotFoundError(), null
            else
                if taskCategory?
                    callback null, taskCategory
                else
                    callback new errors.TaskCategoryNotFoundError(), null

    @create: (title, description, callback) ->
        TaskCategory.find(title: title).count (err, count) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                if count > 0
                    callback new errors.DuplicateTaskCategoryTitleError(), null
                else
                    now = new Date()
                    taskCategory = new TaskCategory
                        title: title
                        description: description
                        createdAt: now
                        updatedAt: now
                    taskCategory.save (err, taskCategory) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError(), null
                        else
                            callback null, taskCategory

                            publisher.publish 'realtime', new CreateTaskCategoryEvent taskCategory

    @update: (id, title, description, callback) ->
        TaskCategoryController.get id, (err, taskCategory) ->
            if err?
                callback err, null
            else
                TaskCategory.find(title: title).count (err, count) ->
                    if err?
                        logger.error err
                        callback new errors.InternalError(), null
                    else
                        if count > 0 and title != taskCategory.title
                            callback new errors.DuplicateTaskCategoryTitleError(), null
                        else
                            taskCategory.title = title
                            taskCategory.description = description
                            taskCategory.updatedAt = new Date()
                            taskCategory.save (err, taskCategory) ->
                                if err?
                                    logger.error err
                                    callback new errors.InternalError(), null
                                else
                                    callback null, taskCategory

                                    publisher.publish 'realtime', new UpdateTaskCategoryEvent taskCategory

    @remove: (id, callback) ->
        TaskController.getByCategory id, (err, tasks) ->
            if err?
                callback err
            else
                if tasks.length > 0
                    callback new errors.TaskCategoryAttachedError()
                else
                    TaskCategory.remove _id: id, (err) ->
                        if err?
                            callback new errors.TaskCategoryNotFoundError()
                        else
                            callback null
                            publisher.publish 'realtime', new RemoveTaskCategoryEvent id


module.exports = TaskCategoryController
