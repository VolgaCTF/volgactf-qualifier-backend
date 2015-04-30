express = require 'express'

categoryRouter = require './task-category'

securityMiddleware = require '../middleware/security'
sessionMiddleware = require '../middleware/session'
contestMiddleware = require '../middleware/contest'
taskMiddleware = require '../middleware/task'
teamMiddleware = require '../middleware/team'

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
TeamTaskProgressController = require '../controllers/team-task-progress'
taskSerializer = require '../serializers/task'
constants = require '../utils/constants'
taskParam = require '../params/task'

LimitController = require '../controllers/limit'
when_ = require 'when'
LogController = require '../controllers/log'


router.param 'taskId', taskParam.id


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


router.get '/:taskId/full', sessionMiddleware.needsToBeAuthorizedSupervisor, (request, response, next) ->
    serializer = _.partial taskSerializer, _, full: yes
    TaskController.get request.taskId, (err, task) ->
        if err?
            next err
        else
            response.json serializer task


router.post '/:taskId/submit', sessionMiddleware.needsToBeAuthorizedTeam, contestMiddleware.contestIsStarted, securityMiddleware.checkToken, taskMiddleware.getTask, teamMiddleware.getTeam, urlencodedParser, (request, response, next) ->
    unless request.team.emailConfirmed
        throw new errors.EmailNotConfirmedError()

    limiter = new LimitController "themis__team#{request.session.identityID}__task#{request.taskId}__submit", timeout: constants.TASK_SUBMIT_LIMIT_TIME, maxAttempts: constants.TASK_SUBMIT_LIMIT_ATTEMPTS
    limiter.check (err, limitExceeded) ->
        if err?
            next err
        else
            if limitExceeded
                next new errors.TaskSubmitAttemptsLimitError()
            else
                submitConstraints =
                    answer: constraints.taskAnswer

                validationResult = validator.validate request.body, submitConstraints
                if validationResult is true
                    TaskController.checkAnswer request.task, request.body.answer, (err, checkResult) ->
                        if err?
                            next err
                        else
                            if checkResult
                                TeamTaskProgressController.create request.session.identityID, request.task, (err, teamTaskProgress) ->
                                    if err?
                                        next err
                                    else
                                        response.json success: yes
                                        LogController.pushLog constants.LOG_TEAM_TASK_SUBMIT_SUCCESS, teamId: request.session.identityID, taskId: request.taskId
                            else
                                next new errors.WrongTaskAnswerError()
                                LogController.pushLog constants.LOG_TEAM_TASK_SUBMIT_ERROR, teamId: request.session.identityID, taskId: request.taskId, answer: request.body.answer
                else
                    next new errors.ValidationError()


router.post '/:taskId/revise', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedSupervisor, taskMiddleware.getTask, urlencodedParser, (request, response, next) ->
    reviseConstraints =
        answer: constraints.taskAnswer

    validationResult = validator.validate request.body, reviseConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    TaskController.checkAnswer request.task, request.body.answer, (err, checkResult) ->
        if err?
            next err
        else
            if checkResult
                response.json success: yes
            else
                next new errors.WrongTaskAnswerError()


router.post '/:taskId/open', contestMiddleware.contestIsStarted, securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, taskMiddleware.getTask, (request, response, next) ->
    TaskController.open request.task, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/:taskId/close', contestMiddleware.contestIsStarted, securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, taskMiddleware.getTask, (request, response, next) ->
    TaskController.close request.task, (err) ->
        if err?
            next err
        else
            response.json success: yes


sanitizeCreateTaskParams = (params, callback) ->
    sanitizeTitle = ->
        deferred = when_.defer()
        deferred.resolve params.title
        deferred.promise

    sanitizeDescription = ->
        deferred = when_.defer()
        deferred.resolve params.description
        deferred.promise

    sanitizeHints = ->
        deferred = when_.defer()
        hints = params.hints
        unless hints?
            hints = []
        if is_.string hints
            hints = [hints]
        hints = _.uniq hints
        deferred.resolve hints
        deferred.promise

    sanitizeValue = ->
        deferred = when_.defer()
        value = parseInt params.value, 10
        if is_.number value
            deferred.resolve value
        else
            deferred.reject new errors.ValidationError()
        deferred.promise

    sanitizeCategories = ->
        deferred = when_.defer()
        categories = params.categories
        unless categories?
            categories = []
        if is_.string categories
            categories = [categories]

        if is_.array categories
            valCategories = []
            for valCategoryStr in categories
                valCategory = parseInt valCategoryStr, 10
                if is_.number valCategory
                    valCategories.push valCategory
            deferred.resolve _.uniq valCategories
        else
            deferred.reject new errors.ValidationError()
        deferred.promise

    sanitizeAnswers = ->
        deferred = when_.defer()
        answers = params.answers
        unless answers?
            answers = []
        if is_.string answers
            answers = [answers]

        if is_.array answers
            deferred.resolve _.uniq answers
        else
            deferred.reject new errors.ValidationError()
        deferred.promise

    sanitizeCaseSensitive = ->
        deferred = when_.defer()
        caseSensitive = params.caseSensitive == 'true'
        if is_.boolean caseSensitive
            deferred.resolve caseSensitive
        else
            deferred.reject new errors.ValidationError()
        deferred.promise

    when_
        .all [sanitizeTitle(), sanitizeDescription(), sanitizeHints(), sanitizeValue(), sanitizeCategories(), sanitizeAnswers(), sanitizeCaseSensitive()]
        .then (res) ->
            result =
                title: res[0]
                description: res[1]
                hints: res[2]
                value: res[3]
                categories: res[4]
                answers: res[5]
                caseSensitive: res[6]
            callback null, result
        .catch (err) ->
            callback err, null


router.post '/create', contestMiddleware.contestNotFinished, securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) ->
    sanitizeCreateTaskParams request.body, (err, taskParams) ->
        if err?
            next err
        else
            createConstraints =
                title: constraints.taskTitle
                description: constraints.taskDescription
                hints: constraints.taskHints
                value: constraints.taskValue
                categories: constraints.taskCategories
                answers: constraints.taskAnswers
                caseSensitive: constraints.taskCaseSensitive

            validationResult = validator.validate taskParams, createConstraints
            if validationResult is true
                TaskController.create taskParams, (err, task) ->
                    if err?
                        next err
                    else
                        response.json success: yes
            else
                next new errors.ValidationError()


sanitizeUpdateTaskParams = (params, task, callback) ->
    sanitizeDescription = ->
        deferred = when_.defer()
        deferred.resolve params.description
        deferred.promise

    sanitizeHints = ->
        deferred = when_.defer()
        hints = params.hints
        unless hints?
            hints = []
        if is_.string hints
            hints = [hints]
        hints = _.uniq hints
        deferred.resolve hints
        deferred.promise

    sanitizeCategories = ->
        deferred = when_.defer()
        categories = params.categories
        unless categories?
            categories = []
        if is_.string categories
            categories = [categories]

        if is_.array categories
            valCategories = []
            for valCategoryStr in categories
                valCategory = parseInt valCategoryStr, 10
                if is_.number valCategory
                    valCategories.push valCategory
            deferred.resolve _.uniq valCategories
        else
            logger.error 'YEAH'
            deferred.reject new errors.ValidationError()
        deferred.promise

    sanitizeAnswers = ->
        deferred = when_.defer()
        answers = params.answers
        unless answers?
            answers = []
        if is_.string answers
            answers = [answers]

        if is_.array answers
            deferred.resolve _.uniq answers
        else
            logger.error 'HELL'
            deferred.reject new errors.ValidationError()
        deferred.promise

    when_
        .all [sanitizeDescription(), sanitizeHints(), sanitizeCategories(), sanitizeAnswers()]
        .then (res) ->
            result =
                description: res[0]
                hints: res[1]
                categories: res[2]
                answers: res[3]
            callback null, result
        .catch (err) ->
            callback err, null


router.post '/:taskId/update', contestMiddleware.contestNotFinished, securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, taskMiddleware.getTask, urlencodedParser, (request, response, next) ->
    sanitizeUpdateTaskParams request.body, request.task, (err, taskParams) ->
        if err?
            next err
        else
            updateConstraints =
                description: constraints.taskDescription
                hints: constraints.taskHints
                categories: constraints.taskCategories
                answers: constraints.taskAnswersExtra

            validationResult = validator.validate taskParams, updateConstraints
            if validationResult is true
                TaskController.update request.task, taskParams, (err, task) ->
                    if err?
                        next err
                    else
                        response.json success: yes
            else
                logger.error validationResult
                next new errors.ValidationError()


module.exports = router
