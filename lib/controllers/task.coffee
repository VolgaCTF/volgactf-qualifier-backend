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

    @checkAnswer: (id, proposedAnswer, callback) ->
        TaskController.get id, (err, task) ->
            if err?
                callback err, null
            else
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


module.exports = TaskController
