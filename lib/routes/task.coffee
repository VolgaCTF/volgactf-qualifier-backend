express = require 'express'

categoryRouter = require './task-category'

securityMiddleware = require '../middleware/security'
sessionMiddleware = require '../middleware/session'
contestMiddleware = require '../middleware/contest'

constraints = require '../utils/constraints'
logger = require '../utils/logger'

bodyParser = require 'body-parser'
Validator = require 'validator.js'
validator = new Validator.Validator()
urlencodedParser = bodyParser.urlencoded extended: no

router = express.Router()
router.use '/category', categoryRouter

errors = require '../utils/errors'
is_ = require 'is_js'
_ = require 'underscore'

TaskController = require '../controllers/task'
taskSerializer = require '../serializers/task'
constants = require '../utils/constants'


router.param 'taskId', (request, response, next, taskId) ->
    id = parseInt taskId, 10
    unless is_.number id
        throw new errors.ValidationError()

    request.taskId = id
    next()


router.get '/all', sessionMiddleware.detectScope, (request, response, next) ->
    onFetch = (exposeEmail) ->
        serializer = _.partial taskSerializer, _, preview: yes
        (err, tasks) ->
            if err?
                logger.error err
                next new errors.InternalError()
            else
                response.json _.map tasks, serializer

    if request.scope == 'supervisors'
        TaskController.list onFetch yes
    else
        TaskController.listEligible onFetch no


router.get '/:taskId', sessionMiddleware.detectScope, contestMiddleware.getState, (request, response, next) ->
    guestsEligible = request.scope is 'guests' and request.contest? and request.contest.isFinished()
    teamsEligible = request.scope is 'teams' and request.contest? and not request.contest.isInitial()
    supervisorsEligible = request.scope is 'supervisors'

    unless guestsEligible or teamsEligible or supervisorsEligible
        throw new errors.NotAuthenticatedError()

    TaskController.get request.taskId, (err, task) ->
        if err?
            next err
        else
            response.json taskSerializer task


router.post '/:taskId/revise', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) ->
    reviseConstraints =
        answer: constraints.taskAnswer

    validationResult = validator.validate request.body, reviseConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    TaskController.checkAnswer request.taskId, request.body.answer, (err, checkResult) ->
        if err?
            next err
        else
            if checkResult
                response.json success: yes
            else
                next new errors.WrongTaskAnswerError()


router.post '/:taskId/open', contestMiddleware.contestIsStarted, securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, (request, response, next) ->
    TaskController.open request.taskId, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/:taskId/close', contestMiddleware.contestIsStarted, securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, (request, response, next) ->
    TaskController.close request.taskId, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/create', contestMiddleware.contestNotFinished, securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) ->
    valValue = parseInt request.body.value, 10
    if is_.number valValue
        request.body.value = valValue
    else
        throw new errors.ValidationError()

    valCaseSensitive = request.body.caseSensitive == 'true'
    if is_.boolean valCaseSensitive
        request.body.caseSensitive = valCaseSensitive
    else
        throw new errors.ValidationError()

    valCategories = request.body.categories
    if is_.string valCategories
        request.body.categories = [valCategories]

    valCategories = []
    for valCategoryStr in request.body.categories
        valCategory = parseInt valCategoryStr, 10
        if is_.number valCategory
            valCategories.push valCategory
    request.body.categories = valCategories

    unless request.body.hints?
        request.body.hints = []

    valAnswers = request.body.answers
    if is_.string valAnswers
        request.body.answers = [valAnswers]

    createConstraints =
        title: constraints.taskTitle
        description: constraints.taskDescription
        hints: constraints.taskHints
        value: constraints.taskValue
        categories: constraints.taskCategories
        answers: constraints.taskAnswers
        caseSensitive: constraints.taskCaseSensitive

    validationResult = validator.validate request.body, createConstraints
    unless validationResult is true
        logger.info validationResult
        throw new errors.ValidationError()

    TaskController.create request.body, (err, task) ->
        if err?
            next err
        else
            response.json success: yes


module.exports = router
