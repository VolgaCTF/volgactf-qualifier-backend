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


router.get '/all', (request, response, next) ->
    PostController.list (err, posts) ->
        if err?
            next err
        else
            result = []
            for post in posts
                result.push
                    id: post._id
                    title: post.title
                    description: post.description
                    createdAt: post.createdAt.getTime()
                    updatedAt: post.updatedAt.getTime()

            response.json result


router.post '/create', sessionMiddleware.needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) ->
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


router.post '/:postId/remove', sessionMiddleware.needsToBeAuthorizedSupervisor, (request, response, next) ->
    postId = parseInt request.params.postId, 10

    PostController.remove postId, (err) ->
        if err?
            next err
        else
            response.json success: yes


router.post '/:postId/update', sessionMiddleware.needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) ->
    postId = parseInt request.params.postId, 10

    updateConstraints =
        title: constraints.postTitle
        description: constraints.postDescription

    validationResult = validator.validate request.body, updateConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    PostController.update postId, request.body.title, request.body.description, (err, post) ->
        if err?
            next err
        else
            response.json success: yes


module.exports = router
