import express from 'express'
import bodyParser from 'body-parser'

import teamRouter from '../routes/team'
import postRouter from '../routes/post'
import contestRouter from '../routes/contest'
import taskRouter from '../routes/task'
import categoryRouter from '../routes/category'
import thirdPartyRouter from '../routes/third-party'
import countryRouter from '../routes/country'

import SupervisorController from '../controllers/supervisor'

import Validator from 'validator.js'
let validator = new Validator.Validator()
import constraints from '../utils/constraints'
import TeamController from '../controllers/team'

import { ValidationError, InvalidSupervisorCredentialsError, UnknownIdentityError } from '../utils/errors'

import { needsToBeUnauthorized, needsToBeAuthorized, detectScope } from '../middleware/session'
import tokenUtil from '../utils/token'
import { checkToken } from '../middleware/security'
import getLastEventId from '../middleware/last-event-id'

import eventStream from '../controllers/event-stream'
import EventController from '../controllers/event'
import logger from '../utils/logger'
import eventNameList from '../utils/event-name-list'

let router = express.Router()

router.use('/team', teamRouter)
router.use('/post', postRouter)
router.use('/contest', contestRouter)
router.use('/task', taskRouter)
router.use('/category', categoryRouter)
router.use('/third-party', thirdPartyRouter)
router.use('/country', countryRouter)

let urlencodedParser = bodyParser.urlencoded({ extended: false })

router.post(
  '/login',
  checkToken,
  needsToBeUnauthorized,
  urlencodedParser,
  (request, response, next) => {
    let loginConstraints = {
      username: constraints.username,
      password: constraints.password
    }

    let validationResult = validator.validate(request.body, loginConstraints)
    if (validationResult !== true) {
      throw new ValidationError()
    }

    SupervisorController.login(request.body.username, request.body.password, (err, supervisor) => {
      if (err) {
        next(err)
      } else {
        if (supervisor) {
          request.session.authenticated = true
          request.session.identityID = supervisor.id
          request.session.role = supervisor.rights
          response.json({ success: true })
        } else {
          next(new InvalidSupervisorCredentialsError())
        }
      }
    })
  }
)

router.post(
  '/signout',
  checkToken,
  needsToBeAuthorized,
  (request, response, next) => {
    request.session.authenticated = false
    request.session.destroy((err) => {
      if (err) {
        next(err)
      } else {
        response.json({ success: true })
      }
    })
  }
)

router.get('/identity', detectScope, (request, response, next) => {
  let token = tokenUtil.encode(tokenUtil.generate(32))
  request.session.token = token

  switch (request.scope) {
    case 'supervisors':
      SupervisorController.get(request.session.identityID, (err, supervisor) => {
        if (err) {
          next(err)
        } else {
          response.json({
            id: request.session.identityID,
            role: supervisor.rights,
            name: supervisor.username,
            token: token
          })
        }
      })
      break
    case 'teams':
      TeamController.get(request.session.identityID, (err, team) => {
        if (err) {
          next(err)
        } else {
          response.json({
            id: request.session.identityID,
            role: 'team',
            name: team.name,
            emailConfirmed: team.emailConfirmed,
            token: token
          })
        }
      })
      break
    case 'guests':
      response.json({
        role: 'guest',
        token: token
      })
      break
    default:
      next(new UnknownIdentityError())
      break
  }
})

function getLatestEvents (lastEventId, callback) {
  if (lastEventId != null) {
    EventController.list(lastEventId, (err, events) => {
      if (err) {
        logger.error(err)
        callback(err, null)
      } else {
        callback(null, events)
      }
    })
  } else {
    callback(null, [])
  }
}

router.get('/events', detectScope, getLastEventId, (request, response, next) => {
  if (!request.scope) {
    throw new UnknownIdentityError()
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  response.write('\n')

  getLatestEvents(request.lastEventId, (err, events) => {
    if (err) {
      logger.error(err)
      next(err)
    } else {
      let writeFunc = (data) => {
        response.write(data)
      }

      logger.info(`Last-Event-ID: ${request.lastEventId}`)

      for (let event of events) {
        if (request.scope === 'supervisors' && event.data.supervisors) {
          logger.info(`Supervisors event: ${event.id}, ${event.type}, ${event.data.supervisors}`)
          writeFunc(eventStream.format(event.id, eventNameList.getName(event.type), 5000, event.data.supervisors))
        } else if (request.scope === 'teams') {
          if (event.data.teams) {
            logger.info(`Teams event: ${event.id}, ${event.type}, ${event.data.teams}`)
            writeFunc(eventStream.format(event.id, eventNameList.getName(event.type), 5000, event.data.teams))
          } else if (event.data.team && event.data.team.hasOwnProperty(request.session.identityID)) {
            logger.info(`Team ${request.session.identityID} event: ${event.id}, ${event.type}, ${event.data.team[request.session.identityID]}`)
            writeFunc(eventStream.format(event.id, eventNameList.getName(event.type), 5000, event.data.team[request.session.identityID]))
          }
        } else if (request.scope === 'guests') {
          logger.info(`Guests event: ${event.id}, ${event.type}, ${event.data.guests}`)
          writeFunc(eventStream.format(event.id, eventNameList.getName(event.type), 5000, event.data.guests))
        }
      }

      logger.info('====================')

      let heartbeatFunc = () => {
        response.write('event: heartbeat\nretry: 5000\ndata: heartbeat\n\n')
      }

      let interval = setInterval(heartbeatFunc, 15000)

      let mainChannel = `message:${request.scope}`
      let extraChannel = null
      if (request.scope === 'teams') {
        extraChannel = `message:team-${request.session.identityID}`
      }

      eventStream.on(mainChannel, writeFunc)
      if (extraChannel) {
        eventStream.on(extraChannel, writeFunc)
      }

      request.once('close', () => {
        clearInterval(interval)
        eventStream.removeListener(mainChannel, writeFunc)
        if (extraChannel) {
          eventStream.removeListener(extraChannel, writeFunc)
        }
      })
    }
  })
})

export default router
