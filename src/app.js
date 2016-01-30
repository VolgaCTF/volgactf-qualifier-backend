import express from 'express'
import bodyParser from 'body-parser'
import logger from './utils/logger'
import cookieParser from 'cookie-parser'

import teamRouter from './routes/team'
import postRouter from './routes/post'
import contestRouter from './routes/contest'
import taskRouter from './routes/task'
import thirdPartyRouter from './routes/third-party'

import SupervisorController from './controllers/supervisor'

import Validator from 'validator.js'
let validator = new Validator.Validator()
import constraints from './utils/constraints'
import _ from 'underscore'
import TeamController from './controllers/team'

import { BaseError, ValidationError, InvalidSupervisorCredentialsError, UnknownIdentityError } from './utils/errors'

import sessionMiddleware, { needsToBeUnauthorized, needsToBeAuthorized, detectScope } from './middleware/session'
import tokenUtil from './utils/token'
import { checkToken } from './middleware/security'
import corsMiddleware from './middleware/cors'

import eventStream from './controllers/event-stream'

let app = express()
app.set('x-powered-by', false)

app.use(corsMiddleware)
app.use(cookieParser())
app.use(sessionMiddleware)

app.use('/team', teamRouter)
app.use('/post', postRouter)
app.use('/contest', contestRouter)
app.use('/task', taskRouter)
app.use('/third-party', thirdPartyRouter)


let urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post(
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
    if (!validationResult) {
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


app.post(
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


app.get('/identity', detectScope, (request, response, next) => {
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


app.get('/events', detectScope, (request, response, next) => {
  if (!request.scope) {
    throw new UnknownIdentityError()
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': `http://${process.env.DOMAIN}`,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'X-CSRF-Token'
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


app.use((err, request, response, next) => {
  if (err instanceof BaseError) {
    response.status(err.getHttpStatus())
    response.json(err.message)
  } else {
    logger.error(err)
    response.status(500)
    response.json('Internal Server Error')
  }
})


export default app
