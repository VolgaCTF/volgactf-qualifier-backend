ContestController = require '../controllers/contest'
constants = require '../utils/constants'
errors = require '../utils/errors'


module.exports.getState = (request, response, next) ->
    ContestController.get (err, contest) ->
        if err?
            next err
        else
            request.contest = contest
            next()


module.exports.contestNotFinished = (request, response, next) ->
    ContestController.get (err, contest) ->
        if err?
            next err
        else
            if contest? and contest.isFinished()
                next new errors.ContestFinishedError()
            else
                next()
