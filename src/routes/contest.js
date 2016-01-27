import express from 'express'
let router = express.Router()

import bodyParser from 'body-parser'
import Validator from 'validator.js'
let validator = new Validator.Validator()
import errors from '../utils/errors'
import constraints from '../utils/constraints'

let urlencodedParser = bodyParser.urlencoded({ extended: false })

import ContestController from '../controllers/contest'
import constants from '../utils/constants'

import sessionMiddleware from '../middleware/session'
import securityMiddleware from '../middleware/security'

import logger from '../utils/logger'
import is_ from 'is_js'
import _ from 'underscore'

import teamScoreSerializer from '../serializers/team-score'
import contestSerializer from '../serializers/contest'
import teamParam from '../params/team'
import taskParam from '../params/task'

import teamTaskProgressController from '../controllers/team-task-progress'
import teamTaskProgressSerializer from '../serializers/team-task-progress'

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


router.get('/progress', sessionMiddleware.needsToBeAuthorizedSupervisor, (request, response, next) => {
  teamTaskProgressController.list((err, teamTaskProgressEntries) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(teamTaskProgressEntries, teamTaskProgressSerializer))
    }
  })
})


router.get('/team/:teamId/progress', sessionMiddleware.detectScope, (request, response, next) => {
  teamTaskProgressController.listForTeam(request.teamId, (err, teamTaskProgressEntries) => {
    if (err) {
      next(err)
    } else {
      if (request.scope === 'supervisors' || (request.scope === 'teams' && request.teamId == request.session.identityID)) {
        response.json(_.map(teamTaskProgressEntries, teamTaskProgressSerializer))
      } else {
        response.json(teamTaskProgressEntries.length)
      }
    }
  })
})


router.get('/task/:taskId/progress', sessionMiddleware.needsToBeAuthorizedTeam, (request, response, next) => {
  teamTaskProgressController.listForTask(request.taskId, (err, teamTaskProgressEntries) => {
    if (err) {
      next(err)
    } else {
      response.json(teamTaskProgressEntries.length)
    }
  })
})


router.get('/logs', sessionMiddleware.needsToBeAuthorizedSupervisor, (request, response, next) => {
  LogController.list((err, logs) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(logs, logSerializer))
    }
  })
})


router.post('/update', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorizedAdmin, urlencodedParser, (request, response, next) => {
  let valState = parseInt(request.body.state, 10)
  if (is_.number(valState)) {
    request.body.state = valState
  } else {
    throw new errors.ValidationError()
  }

  let valStartsAt = parseInt(request.body.startsAt, 10)
  if (is_.number(valStartsAt)) {
    request.body.startsAt = new Date(valStartsAt)
  } else {
    throw new errors.ValidationError()
  }

  let valFinishesAt = parseInt(request.body.finishesAt, 10)
  if (is_.number(valFinishesAt)) {
    request.body.finishesAt = new Date(valFinishesAt)
  } else {
    throw new errors.ValidationError()
  }

  let updateConstraints = {
    state: constraints.contestState,
    startsAt: constraints.contestDateTime,
    finishesAt: constraints.contestDateTime
  }

  let validationResult = validator.validate(request.body, updateConstraints)
  if (!validationResult) {
    logger.error(validationResult)
    throw new errors.ValidationError()
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
