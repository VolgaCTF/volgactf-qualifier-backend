Task = require '../models/task'

logger = require '../utils/logger'
errors = require '../utils/errors'
constants = require '../utils/constants'
publisher = require '../utils/publisher'

_ = require 'underscore'
BaseEvent = require('../utils/events').BaseEvent

taskSerializer = require '../serializers/task'


class CreateTaskEvent extends BaseEvent
    constructor: (task) ->
        super 'createTask'
        taskData = taskSerializer task, preview: yes
        @data.supervisors = taskData


class UpdateTaskEvent extends BaseEvent
    constructor: (task) ->
        super 'updateTask'
        taskData = taskSerializer task, preview: yes
        @data.supervisors = taskData
        unless task.isInitial()
            @data.teams = taskData
            @data.guests = taskData


class OpenTaskEvent extends BaseEvent
    constructor: (task) ->
        super 'openTask'
        taskData = taskSerializer task, preview: yes
        @data.supervisors = taskData
        @data.teams = taskData
        @data.guests = taskData


class CloseTaskEvent extends BaseEvent
    constructor: (task) ->
        super 'closeTask'
        taskData = taskSerializer task, preview: yes
        @data.supervisors = taskData
        @data.teams = taskData
        @data.guests = taskData


class TaskController
    @create: (options, callback) ->
        Task.find(title: options.title).count (err, count) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                if count > 0
                    callback new errors.DuplicateTaskTitleError(), null
                else
                    now = new Date()
                    task = new Task
                        title: options.title
                        description: options.description
                        createdAt: now
                        updatedAt: now
                        hints: options.hints
                        value: options.value
                        categories: options.categories
                        answers: options.answers
                        caseSensitive: options.caseSensitive
                        state: constants.TASK_INITIAL
                    task.save (err, task) ->
                        if err?
                            logger.error err
                            callback new errors.InternalError(), null
                        else
                            callback null, task

                            publisher.publish 'realtime', new CreateTaskEvent task

    @update: (task, options, callback) ->
        task.description = options.description
        task.categories = options.categories
        task.hints = options.hints
        task.answers = _.union task.answers, options.answers
        task.updatedAt = new Date()
        task.save (err, task) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, task

                publisher.publish 'realtime', new UpdateTaskEvent task

    @list: (callback) ->
        Task.find (err, tasks) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, tasks

    @listEligible: (callback) ->
        Task
            .find()
            .or [ {state: constants.TASK_OPENED}, {state: constants.TASK_CLOSED} ]
            .find (err, tasks) ->
                if err?
                    logger.error err
                    callback new errors.InternalError(), null
                else
                    callback null, tasks

    @checkAnswer: (task, proposedAnswer, callback) ->
        unless task.caseSensitive
            proposedAnswer = proposedAnswer.toLowerCase()

        answerCorrect = no
        for answer in task.answers
            if task.caseSensitive
                answerCorrect = proposedAnswer == answer
            else
                answerCorrect = proposedAnswer == answer.toLowerCase()
            if answerCorrect
                break

        callback null, answerCorrect

    @open: (task, callback) ->
        if task.isInitial()
            task.state = constants.TASK_OPENED
            task.updatedAt = new Date()
            task.save (err, task) ->
                if err?
                    logger.error err
                    callback new errors.InternalError()
                else
                    callback null
                    publisher.publish 'realtime', new OpenTaskEvent task
        else
            if task.isOpened()
                callback new errors.TaskAlreadyOpenedError()
            else if task.isClosed()
                callback new errors.TaskClosedError()
            else
                callback new errors.InternalError()

    @close: (task, callback) ->
        if task.isOpened()
            task.state = constants.TASK_CLOSED
            task.updatedAt = new Date()
            task.save (err, task) ->
                if err?
                    logger.error err
                    callback new errors.InternalError()
                else
                    callback null
                    publisher.publish 'realtime', new CloseTaskEvent task
        else
            if task.isInitial()
                callback new errors.TaskNotOpenedError()
            else if task.isClosed()
                callback  new errors.TaskAlreadyClosedError()
            else
                callback new errors.InternalError()

    @get: (id, callback) ->
        Task.findOne _id: id, (err, task) ->
            if err?
                logger.error err
                callback new errors.TaskNotFoundError(), null
            else
                if task?
                    callback null, task
                else
                    callback new errors.TaskNotFoundError(), null

    @getByCategory: (categoryId, callback) ->
        Task.find {}, (err, tasks) ->
            if err?
                logger.error err
                callback new errors.InternalError(), null
            else
                callback null, _.filter tasks, (task) ->
                    _.contains task.categories, categoryId


module.exports = TaskController