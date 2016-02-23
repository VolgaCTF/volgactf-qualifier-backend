import express from 'express'
let router = express.Router()

import bodyParser from 'body-parser'
import Validator from 'validator.js'
let validator = new Validator.Validator()
import { ValidationError } from '../utils/errors'
import constraints from '../utils/constraints'

let urlencodedParser = bodyParser.urlencoded({ extended: false })

import ContestController from '../controllers/contest'

import { needsToBeAuthorizedSupervisor, needsToBeAuthorizedTeam, needsToBeAuthorizedAdmin, detectScope } from '../middleware/session'
import { checkToken } from '../middleware/security'

import logger from '../utils/logger'
import is_ from 'is_js'
import _ from 'underscore'

import teamScoreSerializer from '../serializers/team-score'
import contestSerializer from '../serializers/contest'
import teamParam from '../params/team'
import taskParam from '../params/task'

import TeamTaskHitController from '../controllers/team-task-hit'
import teamTaskHitSerializer from '../serializers/team-task-hit'

import LogController from '../controllers/log'
import logSerializer from '../serializers/log'

router.get('/', (request, response, next) => {
  ContestController.get((err, contest) => {
    if (err) {
      next(err)
    } else {
      response.json(contestSerializer(contest))
    }
  })
})

router.get('/scores', (request, response, next) => {
  ContestController.getScores((err, teamScores) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(teamScores, teamScoreSerializer))
    }
  })
})

router.param('teamId', teamParam.id)
router.param('taskId', taskParam.id)

router.get('/hits', needsToBeAuthorizedSupervisor, (request, response, next) => {
  TeamTaskHitController.list((err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(teamTaskHits, teamTaskHitSerializer))
    }
  })
})

router.get('/team/:teamId/hits', detectScope, (request, response, next) => {
  TeamTaskHitController.listForTeam(request.teamId, (err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      if (request.scope === 'supervisors' || (request.scope === 'teams' && request.teamId === request.session.identityID)) {
        response.json(_.map(teamTaskHits, teamTaskHitSerializer))
      } else {
        response.json(teamTaskHits.length)
      }
    }
  })
})

router.get('/task/:taskId/hits', needsToBeAuthorizedTeam, (request, response, next) => {
  TeamTaskHitController.listForTask(request.taskId, (err, teamTaskHits) => {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskHits.length)
    }
  })
})

router.get('/logs', needsToBeAuthorizedSupervisor, (request, response, next) => {
  LogController.list((err, logs) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(logs, logSerializer))
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
