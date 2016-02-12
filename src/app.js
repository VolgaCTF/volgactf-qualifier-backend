import express from 'express'
import bodyParser from 'body-parser'
import logger from './utils/logger'
import cookieParser from 'cookie-parser'

import apiRouter from './routes/api'

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

import eventStream from './controllers/event-stream'

let app = express()
app.set('x-powered-by', false)
app.set('trust proxy', 'loopback')

app.use(cookieParser())
app.use(sessionMiddleware)

app.use('/api', apiRouter)

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
