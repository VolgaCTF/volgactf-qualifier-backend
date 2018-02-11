const express = require('express')
const router = express.Router()

const bodyParser = require('body-parser')
const Validator = require('validator.js')
const validator = new Validator.Validator()
const { ValidationError } = require('../utils/errors')
const constraints = require('../utils/constraints')

const urlencodedParser = bodyParser.urlencoded({ extended: false })

const ContestController = require('../controllers/contest')

const { needsToBeAuthorizedAdmin } = require('../middleware/session')
const { checkToken } = require('../middleware/security')

const logger = require('../utils/logger')
const is_ = require('is_js')

const contestSerializer = require('../serializers/contest')

router.get('/', function (request, response, next) {
  ContestController.get(function (err, contest) {
    if (err) {
      next(err)
    } else {
      response.json(contestSerializer(contest))
    }
  })
})

router.post('/update', checkToken, needsToBeAuthorizedAdmin, urlencodedParser, function (request, response, next) {
  const valState = parseInt(request.body.state, 10)
  if (is_.number(valState)) {
    request.body.state = valState
  } else {
    throw new ValidationError()
  }

  const valStartsAt = parseInt(request.body.startsAt, 10)
  if (is_.number(valStartsAt)) {
    request.body.startsAt = new Date(valStartsAt)
  } else {
    throw new ValidationError()
  }

  const valFinishesAt = parseInt(request.body.finishesAt, 10)
  if (is_.number(valFinishesAt)) {
    request.body.finishesAt = new Date(valFinishesAt)
  } else {
    throw new ValidationError()
  }

  const updateConstraints = {
    state: constraints.contestState,
    startsAt: constraints.contestDateTime,
    finishesAt: constraints.contestDateTime
  }

  const validationResult = validator.validate(request.body, updateConstraints)
  if (validationResult !== true) {
    logger.error(validationResult)
    throw new ValidationError()
  }

  ContestController.manualUpdate(request.body.state, request.body.startsAt, request.body.finishesAt, function (err, contest) {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

module.exports = router
