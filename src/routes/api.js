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

import eventStream from '../controllers/event-stream'

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

router.get('/events', detectScope, (request, response, next) => {
  if (!request.scope) {
    throw new UnknownIdentityError()
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  response.write('\n')

  let pushEventFunc = function (data) {
    response.write(data)
  }

  let mainChannel = `message:${request.scope}`
  let extraChannel = null
  if (request.scope === 'teams') {
    extraChannel = `message:team${request.session.identityID}`
  }

  eventStream.on(mainChannel, pushEventFunc)
  if (extraChannel) {
    eventStream.on(extraChannel, pushEventFunc)
  }

  request.once('close', () => {
    eventStream.removeListener(mainChannel, pushEventFunc)
    if (extraChannel) {
      eventStream.removeListener(extraChannel, pushEventFunc)
    }
  })
})

export default router
