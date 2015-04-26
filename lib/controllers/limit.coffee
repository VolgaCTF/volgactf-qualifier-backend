redis = require '../utils/redis'
redisClient = redis.createClient()
errors = require '../utils/errors'
logger = require '../utils/logger'
_ = require 'underscore'


class LimitController
    constructor: (key, options = {}) ->
        defaultOptions =
            timeout: 10
            maxAttempts: 3
        options = _.extend defaultOptions, options
        @key = key
        @timeout = options.timeout
        @maxAttempts = options.maxAttempts

    check: (callback) ->
        redisClient.incr @key, (err, attempts) =>
            if err?
                logger.err err
                callback new errors.InternalError(), null
            else
                redisClient.ttl @key, (err, ttl) =>
                    if err?
                        logger.error err
                        callback new errors.InternalError(), null
                    else
                        returnValue = attempts > @maxAttempts
                        if ttl < 0
                            redisClient.expire @key, @timeout, (err) =>
                                if err?
                                    logger.error err
                                    callback new errors.InternalError(), null
                                else
                                    callback null, returnValue
                        else
                            callback null, returnValue


module.exports = LimitController
