ContestController = require '../controllers/contest'
constants = require '../utils/constants'
errors = require '../utils/errors'

module.exports.contestNotFinished = (request, response, next) ->
    ContestController.get (err, contest) ->
        if err?
            next err
        else
            if contest? and contest.state == constants.CONTEST_FINISHED
                next new errors.ContestFinishedError()
            else
                next()
