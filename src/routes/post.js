import express from 'express'
import _ from 'underscore'
import bodyParser from 'body-parser'
import Validator from 'validator.js'
let validator = new Validator.Validator()

import PostController from '../controllers/post'
import { ValidationError } from '../utils/errors'
import constraints from '../utils/constraints'

let urlencodedParser = bodyParser.urlencoded({ extended: false })
let router = express.Router()

import { needsToBeAuthorizedSupervisor } from '../middleware/session'
import { checkToken } from '../middleware/security'

import postParam from '../params/post'

import postSerializer from '../serializers/post'

router.get('/index', (request, response, next) => {
  PostController.index((err, posts) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(posts, postSerializer))
    }
  })
})

router.post('/create', checkToken, needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) => {
  let createConstraints = {
    title: constraints.postTitle,
    description: constraints.postDescription
  }

  let validationResult = validator.validate(request.body, createConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  PostController.create(request.body.title, request.body.description, (err, post) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.param('postId', postParam.id)

router.post('/:postId/delete', checkToken, needsToBeAuthorizedSupervisor, (request, response, next) => {
  PostController.delete(request.postId, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/:postId/update', checkToken, needsToBeAuthorizedSupervisor, urlencodedParser, (request, response, next) => {
  let updateConstraints = {
    title: constraints.postTitle,
    description: constraints.postDescription
  }

  let validationResult = validator.validate(request.body, updateConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  PostController.update(request.postId, request.body.title, request.body.description, (err, post) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

export default router
