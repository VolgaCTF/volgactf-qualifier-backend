import { AlreadyAuthenticatedError, NotAuthenticatedError } from '../utils/errors'
import _ from 'underscore'
import session from 'express-session'
import connectRedis from 'connect-redis'
let RedisStore = connectRedis(session)
import redis from '../utils/redis'


export function needsToBeUnauthorized(request, response, next) {
  if (request.session.authenticated) {
    throw new AlreadyAuthenticatedError()
  } else {
    next()
  }
}


export function needsToBeAuthorized(request, response, next) {
  if (request.session.authenticated) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}


export function needsToBeAuthorizedTeam(request, response, next) {
  if (request.session.authenticated && request.session.role === 'team') {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}


export function needsToBeAuthorizedSupervisor(request, response, next) {
  if (request.session.authenticated && _.contains(['admin', 'manager'], request.session.role)) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}


export function needsToBeAuthorizedAdmin(request, response, next) {
  if (request.session.authenticated && request.session.role === 'admin') {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}


export function detectScope(request, response, next) {
  if (request.session.authenticated) {
    if (request.session.role === 'team') {
      request.scope = 'teams'
    } else if (_.contains(['admin', 'manager'], request.session.role)) {
      request.scope = 'supervisors'
    } else {
      request.scope = null
    }
  } else {
    request.scope = 'guests'
  }
  next()
}


export default session({
  store: new RedisStore({
    client: redis.createClient()
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'themis-session-id',
  cookie: {
    domain: 'api.' + process.env.DOMAIN,
    path: '/',
    httpOnly: true,
    secure: false,
    expires: false
  }
})
