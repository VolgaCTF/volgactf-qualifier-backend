Log = require '../models/log'
logger = require '../utils/logger'
errors = require '../utils/errors'
publisher = require '../utils/publisher'
_ = require 'underscore'
BaseEvent = require('../utils/events').BaseEvent

logSerializer = require '../serializers/log'


class CreateLogEvent extends BaseEvent
    constructor: (log) ->
        super 'createLog'
        logData = logSerializer log
        @data.supervisors = logData


class LogController
    @pushLog: (eventName, data, callback = null) ->
        log = new Log
            event: eventName
            createdAt: new Date()
            data: data

        log.save (err, log) ->
            if err?
                logger.error err
                if callback?
                    callback new errors.InternalError()
            else
                publisher.publish 'realtime', new CreateLogEvent log
                if callback?
                    callback null


module.exports = LogController
