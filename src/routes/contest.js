import express from 'express'
let router = express.Router()

import bodyParser from 'body-parser'
import Validator from 'validator.js'
let validator = new Validator.Validator()
import { ValidationError } from '../utils/errors'
import constraints from '../utils/constraints'

let urlencodedParser = bodyParser.urlencoded({ extended: false })

import ContestController from '../controllers/contest'

import { needsToBeAuthorizedAdmin } from '../middleware/session'
import { checkToken } from '../middleware/security'

import logger from '../utils/logger'
import is_ from 'is_js'

import contestSerializer from '../serializers/contest'

router.get('/', (request, response, next) => {
  ContestController.get((err, contest) => {
    if (err) {
      next(err)
    } else {
      response.json(contestSerializer(contest))
    }
  })
})

router.post('/update', checkToken, needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) => {
  let valState = parseInt(request.body.state, 10)
  if (is_.number(valState)) {
    request.body.state = valState
  } else {
    throw new ValidationError()
  }

  let valStartsAt = parseInt(request.body.startsAt, 10)
  if (is_.number(valStartsAt)) {
    request.body.startsAt = new Date(valStartsAt)
  } else {
    throw new ValidationError()
  }

  let valFinishesAt = parseInt(request.body.finishesAt, 10)
  if (is_.number(valFinishesAt)) {
    request.body.finishesAt = new Date(valFinishesAt)
  } else {
    throw new ValidationError()
  }

  let updateConstraints = {
    state: constraints.contestState,
    startsAt: constraints.contestDateTime,
    finishesAt: constraints.contestDateTime
  }

  let validationResult = validator.validate(request.body, updateConstraints)
  if (validationResult !== true) {
    logger.error(validationResult)
    throw new ValidationError()
  }

  ContestController.update(request.body.state, request.body.startsAt, request.body.finishesAt, (err, contest) => {
    if (err) {
      next(err)
    } else {
      response.json({ success: true })
    }
  })
})

export default router
