import express from 'express'
import _ from 'underscore'
import is_ from 'is_js'
let router = express.Router()

import TaskCategoryController from '../controllers/task-category'
import taskCategorySerializer from '../serializers/task-category'

import { checkToken } from '../middleware/security'
import { needsToBeAuthorizedAdmin } from '../middleware/session'
import { contestNotFinished } from '../middleware/contest'

import Validator from 'validator.js'
let validator = new Validator.Validator()
import constraints from '../utils/constraints'

import bodyParser from 'body-parser'
let urlencodedParser = bodyParser.urlencoded({ extended: false })

import taskCategoryParam from '../params/task-category'


router.get('/all', (request, response, next) => {
  TaskCategoryController.list((err, taskCategories) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(taskCategories, taskCategorySerializer))
    }
  })
})


router.post('/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) => {
  let createConstraints = {
    title: constraints.taskCategoryTitle,
    description: constraints.taskCategoryDescription
  }

  let validationResult = validator.validate(request.body, createConstraints)
  if (!validationResult) {
    throw new errors.ValidationError()
  }

  TaskCategoryController.create(request.body.title, request.body.description, (err, taskCategory) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})


router.param('taskCategoryId', taskCategoryParam.id)


router.post('/:taskCategoryId/remove', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, (request, response, next) => {
  TaskCategoryController.remove(request.taskCategoryId, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})


router.post('/:taskCategoryId/update', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) => {
  let updateConstraints = {
    title: constraints.taskCategoryTitle,
    description: constraints.taskCategoryDescription
  }

  let validationResult = validator.validate(request.body, updateConstraints)
  if (!validationResult) {
    throw new errors.ValidationError()
  }

  TaskCategoryController.update(request.taskCategoryId, request.body.title, request.body.description, (err, post) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})


export default router
