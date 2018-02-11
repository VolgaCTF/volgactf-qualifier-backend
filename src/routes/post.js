const express = require('express')
const _ = require('underscore')
const bodyParser = require('body-parser')
const Validator = require('validator.js')
const validator = new Validator.Validator()

const PostController = require('../controllers/post')
const { ValidationError } = require('../utils/errors')
const constraints = require('../utils/constraints')

const urlencodedParser = bodyParser.urlencoded({ extended: false })
const router = express.Router()

const { needsToBeAuthorizedSupervisor } = require('../middleware/session')
const { checkToken } = require('../middleware/security')

const postParam = require('../params/post')

const postSerializer = require('../serializers/post')

router.get('/index', function (request, response, next) {
  PostController.index(function (err, posts) {
    if (err) {
      next(err)
    } else {
      response.json(_.map(posts, postSerializer))
    }
  })
})

router.post('/create', checkToken, needsToBeAuthorizedSupervisor, urlencodedParser, function (request, response, next) {
  const createConstraints = {
    title: constraints.postTitle,
    description: constraints.postDescription
  }

  const validationResult = validator.validate(request.body, createConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  PostController.create(request.body.title, request.body.description, function (err, post) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.param('postId', postParam.id)

router.post('/:postId/delete', checkToken, needsToBeAuthorizedSupervisor, function (request, response, next) {
  PostController.delete(request.postId, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/:postId/update', checkToken, needsToBeAuthorizedSupervisor, urlencodedParser, function (request, response, next) {
  const updateConstraints = {
    title: constraints.postTitle,
    description: constraints.postDescription
  }

  const validationResult = validator.validate(request.body, updateConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  PostController.update(request.postId, request.body.title, request.body.description, function (err, post) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

module.exports = router
