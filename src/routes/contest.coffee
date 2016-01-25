express = require 'express'
router = express.Router()

bodyParser = require 'body-parser'
Validator = require 'validator.js'
validator = new Validator.Validator()
errors = require '../utils/errors'
constraints = require '../utils/constraints'

urlencodedParser = bodyParser.urlencoded extended: no

ContestController = require '../controllers/contest'
constants = require '../utils/constants'

sessionMiddleware = require '../middleware/session'
securityMiddleware = require '../middleware/security'

logger = require '../utils/logger'
is_ = require 'is_js'
_ = require 'underscore'

teamScoreSerializer = require '../serializers/team-score'
contestSerializer = require '../serializers/contest'
teamParam = require '../params/team'
taskParam = require '../params/task'

teamTaskProgressController = require '../controllers/team-task-progress'
teamTaskProgressSerializer = require '../serializers/team-task-progress'

LogController = require '../controllers/log'
logSerializer = require '../serializers/log'


router.get '/', (request, response, next) ->
    ContestController.get (err, contest) ->
        if err?
            next err
        else
            response.json contestSerializer contest


router.get '/scores', (request, response, next) ->
    ContestController.getScores (err, teamScores) ->
        if err?
            next err
        else
            response.json _.map teamScores, teamScoreSerializer


router.param 'teamId', teamParam.id
router.param 'taskId', taskParam.id


router.get '/progress', sessionMiddleware.needsToBeAuthorizedSupervisor, (request, response, next) ->
    teamTaskProgressController.list (err, teamTaskProgressEntries) ->
        if err?
            next err
        else
            response.json _.map teamTaskProgressEntries, teamTaskProgressSerializer


router.get '/team/:teamId/progress', sessionMiddleware.detectScope, (request, response, next) ->
    teamTaskProgressController.listForTeam request.teamId, (err, teamTaskProgressEntries) ->
        if err?
            next err
        else
            if request.scope is 'supervisors' or (request.scope is 'teams' and request.teamId == request.session.identityID)
                response.json _.map teamTaskProgressEntries, teamTaskProgressSerializer
            else
                response.json teamTaskProgressEntries.length


router.get '/task/:taskId/progress', sessionMiddleware.needsToBeAuthorizedTeam, (request, response, next) ->
    teamTaskProgressController.listForTask request.taskId, (err, teamTaskProgressEntries) ->
        if err?
            next err
        else
            response.json teamTaskProgressEntries.length


router.get '/logs', sessionMiddleware.needsToBeAuthorizedSupervisor, (request, response, next) ->
    LogController.list (err, logs) ->
        if err?
            next err
        else
            response.json _.map logs, logSerializer


router.post '/update', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) ->
    valState = parseInt request.body.state, 10
    if is_.number valState
        request.body.state = valState
    else
        throw new errors.ValidationError()

    valStartsAt = parseInt request.body.startsAt, 10
    if is_.number valStartsAt
        request.body.startsAt = new Date valStartsAt
    else
        throw new errors.ValidationError()

    valFinishesAt = parseInt request.body.finishesAt, 10
    if is_.number valFinishesAt
        request.body.finishesAt = new Date valFinishesAt
    else
        throw new errors.ValidationError()

    updateConstraints =
        state: constraints.contestState
        startsAt: constraints.contestDateTime
        finishesAt: constraints.contestDateTime

    validationResult = validator.validate request.body, updateConstraints
    unless validationResult is true
        logger.error validationResult
        throw new errors.ValidationError()

    ContestController.update request.body.state, request.body.startsAt, request.body.finishesAt, (err, contest) ->
        if err?
            next err
        else
            response.json success: yes


module.exports = router
