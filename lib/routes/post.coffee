express = require 'express'
_ = require 'underscore'
bodyParser = require 'body-parser'
Validator = require 'validator.js'
validator = new Validator.Validator()

PostController = require '../controllers/post'
errors = require '../utils/errors'
constraints = require '../utils/constraints'

urlencodedParser = bodyParser.urlencoded extended: no
router = express.Router()

sessionMiddleware = require '../middleware/session'
securityMiddleware = require '../middleware/security'

is_ = require 'is_js'
_ = require 'underscore'

postSerializer = require '../serializers/post'


router.get '/all', (request, response, next) ->
    PostController.list (err, posts) ->
        if err?
            next err
        else
            response.json _.map posts, postSerializer


router.post '/create', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) ->
    createConstraints =
        title: constraints.postTitle
        description: constraints.postDescription

    validationResult = validator.validate request.body, createConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    PostController.create request.body.title, request.body.description, (err, post) ->
        if err?
            next err
        else
            response.json success: yes


router.param 'postId', (request, response, next, postId) ->
    id = parseInt postId, 10
    unless is_.number id
        throw new errors.ValidationError()

    request.postId = id
    next()


router.post '/:postId/remove', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedSupervisor, (request, response, next) ->
    PostController.remove request.postId, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/:postId/update', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) ->
    updateConstraints =
        title: constraints.postTitle
        description: constraints.postDescription

    validationResult = validator.validate request.body, updateConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    PostController.update request.postId, request.body.title, request.body.description, (err, post) ->
        if err?
            next err
        else
            response.json success: yes


module.exports = router
