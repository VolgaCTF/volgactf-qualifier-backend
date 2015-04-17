Contest = require '../models/contest'
errors = require '../utils/errors'


class ContestController
    @get: (callback) ->
        Contest.findOne {}, (err, contest) ->
            if err?
                logger.error err
                callback new errors.ContestNotInitializedError(), null
            else
                # Warning: this can be null. This is a normal situation.
                callback null, contest


module.exports = ContestController
