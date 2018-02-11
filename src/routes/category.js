const express = require('express')
const _ = require('underscore')
const router = express.Router()

const CategoryController = require('../controllers/category')
const categorySerializer = require('../serializers/category')

const { checkToken } = require('../middleware/security')
const { needsToBeAuthorizedAdmin } = require('../middleware/session')
const { contestNotFinished } = require('../middleware/contest')

const Validator = require('validator.js')
const validator = new Validator.Validator()
const constraints = require('../utils/constraints')

const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })

const categoryParam = require('../params/category')
const { ValidationError } = require('../utils/errors')

router.get('/index', function (request, response, next) {
  CategoryController.index(function (err, categories) {
    if (err) {
      next(err)
    } else {
      response.json(_.map(categories, categorySerializer))
    }
  })
})

router.post('/create', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, function (request, response, next) {
  const createConstraints = {
    title: constraints.categoryTitle,
    description: constraints.categoryDescription
  }

  const validationResult = validator.validate(request.body, createConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  CategoryController.create(request.body.title, request.body.description, function (err, category) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.param('categoryId', categoryParam.id)

router.post('/:categoryId/delete', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, function (request, response, next) {
  CategoryController.delete(request.categoryId, function (err) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

router.post('/:categoryId/update', contestNotFinished, checkToken, needsToBeAuthorizedAdmin, urlencodedParser, function (request, response, next) {
  const updateConstraints = {
    title: constraints.categoryTitle,
    description: constraints.categoryDescription
  }

  const validationResult = validator.validate(request.body, updateConstraints)
  if (validationResult !== true) {
    throw new ValidationError()
  }

  CategoryController.update(request.categoryId, request.body.title, request.body.description, function (err, post) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

module.exports = router
