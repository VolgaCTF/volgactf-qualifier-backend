import { AlreadyAuthenticatedError, NotAuthenticatedError } from '../utils/errors'
import _ from 'underscore'
import session from 'express-session'
import connectRedis from 'connect-redis'
let RedisStore = connectRedis(session)
import redis from '../utils/redis'
import constants from '../utils/constants'

export function needsToBeUnauthorized (request, response, next) {
  if (request.session.authenticated) {
    throw new AlreadyAuthenticatedError()
  } else {
    next()
  }
}

export function needsToBeAuthorized (request, response, next) {
  if (request.session.authenticated) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}

export function needsToBeAuthorizedTeam (request, response, next) {
  if (request.session.authenticated && request.session.scopeID === constants.SCOPE_TEAM) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}

export function needsToBeAuthorizedSupervisor (request, response, next) {
  if (request.session.authenticated && _.contains([constants.SCOPE_MANAGER, constants.SCOPE_ADMIN], request.session.scopeID)) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}

export function needsToBeAuthorizedAdmin (request, response, next) {
  if (request.session.authenticated && request.session.scopeID === constants.SCOPE_ADMIN) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}

class UserScope {
  constructor (scope) {
    this.scope = scope
  }

  toString () {
    if (this.isGuest()) {
      return 'guests'
    } else if (this.isTeam()) {
      return 'teams'
    } else if (this.isSupervisor()) {
      return 'supervisors'
    } else {
      return 'null'
    }
  }

  isGuest () {
    return this.scope === constants.SCOPE_GUEST
  }

  isTeam () {
    return this.scope === constants.SCOPE_TEAM
  }

  isManager () {
    return this.scope === constants.SCOPE_MANAGER
  }

  isAdmin () {
    return this.scope === constants.SCOPE_ADMIN
  }

  isSupervisor () {
    return this.isManager() || this.isAdmin()
  }
}

export function detectScope (request, response, next) {
  if (request.session.authenticated) {
    request.scope = new UserScope(request.session.scopeID)
  } else {
    request.scope = new UserScope(constants.SCOPE_GUEST)
  }
  next()
}

export default session({
  store: new RedisStore({
    client: redis.createClient()
  }),
  secret: process.env.THEMIS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'themis-session-id',
  cookie: {
    domain: process.env.THEMIS_DOMAIN,
    path: '/api',
    httpOnly: true,
    secure: true,
    expires: false
  }
})
