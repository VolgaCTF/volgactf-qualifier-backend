import express from 'express'
import _ from 'underscore'
let router = express.Router()

import CategoryController from '../controllers/category'
import categorySerializer from '../serializers/category'

import { checkToken } from '../middleware/security'
import { needsToBeAuthorizedAdmin } from '../middleware/session'
import { contestNotFinished } from '../middleware/contest'

import Validator from 'validator.js'
let validator = new Validator.Validator()
import constraints from '../utils/constraints'

import bodyParser from 'body-parser'
let urlencodedParser = bodyParser.urlencoded({ extended: false })

import categoryParam from '../params/category'
import { ValidationError } from '../utils/errors'

router.get('/all', (request, response, next) => {
  CategoryController.list((err, categories) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(categories, categorySerializer))
    }
  })
})

router.post('/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) => {
  let createConstraints = {
    title: constraints.categoryTitle,
    description: constraints.categoryDescription
  }

  let validationResult = validator.validate(request.body, createConstraints)
  if (!validationResult) {
    throw new ValidationError()
  }

  CategoryController.create(request.body.title, request.body.description, (err, category) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.param('categoryId', categoryParam.id)

router.post('/:categoryId/remove', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, (request, response, next) => {
  CategoryController.remove(request.categoryId, (err) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/:categoryId/update', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) => {
  let updateConstraints = {
    title: constraints.categoryTitle,
    description: constraints.categoryDescription
  }

  let validationResult = validator.validate(request.body, updateConstraints)
  if (!validationResult) {
    throw new ValidationError()
  }

  CategoryController.update(request.categoryId, request.body.title, request.body.description, (err, post) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

export default router
