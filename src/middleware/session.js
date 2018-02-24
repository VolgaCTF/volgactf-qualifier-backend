const { AlreadyAuthenticatedError, NotAuthenticatedError } = require('../utils/errors')
const _ = require('underscore')
const session = require('express-session')
const connectRedis = require('connect-redis')
const RedisStore = connectRedis(session)
const redis = require('../utils/redis')
const { SCOPE_TEAM, SCOPE_MANAGER, SCOPE_ADMIN, SCOPE_GUEST } = require('../utils/constants')

function needsToBeUnauthorized (request, response, next) {
  if (request.session.authenticated) {
    throw new AlreadyAuthenticatedError()
  } else {
    next()
  }
}
module.exports.needsToBeUnauthorized = needsToBeUnauthorized

function needsToBeAuthorized (request, response, next) {
  if (request.session.authenticated) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}
module.exports.needsToBeAuthorized = needsToBeAuthorized

function needsToBeAuthorizedTeam (request, response, next) {
  if (request.session.authenticated && request.session.scopeID === SCOPE_TEAM) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}
module.exports.needsToBeAuthorizedTeam = needsToBeAuthorizedTeam

function needsToBeAuthorizedSupervisor (request, response, next) {
  if (request.session.authenticated && _.contains([SCOPE_MANAGER, SCOPE_ADMIN], request.session.scopeID)) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}
module.exports.needsToBeAuthorizedSupervisor = needsToBeAuthorizedSupervisor

function needsToBeAuthorizedAdmin (request, response, next) {
  if (request.session.authenticated && request.session.scopeID === SCOPE_ADMIN) {
    next()
  } else {
    throw new NotAuthenticatedError()
  }
}
module.exports.needsToBeAuthorizedAdmin = needsToBeAuthorizedAdmin

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
    return this.scope === SCOPE_GUEST
  }

  isTeam () {
    return this.scope === SCOPE_TEAM
  }

  isManager () {
    return this.scope === SCOPE_MANAGER
  }

  isAdmin () {
    return this.scope === SCOPE_ADMIN
  }

  isSupervisor () {
    return this.isManager() || this.isAdmin()
  }
}

function detectScope (request, response, next) {
  if (request.session.authenticated) {
    request.scope = new UserScope(request.session.scopeID)
  } else {
    request.scope = new UserScope(SCOPE_GUEST)
  }
  next()
}
module.exports.detectScope = detectScope

let secureConnection = false
if (process.env.THEMIS_QUALS_SECURE) {
  secureConnection = process.env.THEMIS_QUALS_SECURE === 'yes'
}

module.exports.session = session({
  store: new RedisStore({
    client: redis.createClient()
  }),
  secret: process.env.THEMIS_QUALS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'themis-quals-session',
  cookie: {
    domain: process.env.THEMIS_QUALS_FQDN,
    path: '/',
    httpOnly: true,
    secure: secureConnection,
    expires: false
  }
})
