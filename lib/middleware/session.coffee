errors = require '../utils/errors'
_ = require 'underscore'
session = require 'express-session'
RedisStore = require('connect-redis') session
redis = require '../utils/redis'



module.exports.needsToBeUnauthorized = (request, response, next) ->
    if request.session.authenticated
        throw new errors.AlreadyAuthenticatedError()
    else
        next()


module.exports.needsToBeAuthorized = (request, response, next) ->
    if request.session.authenticated
        next()
    else
        throw new errors.NotAuthenticatedError()


module.exports.needsToBeAuthorizedTeam = (request, response, next) ->
    if request.session.authenticated and request.session.role is 'team'
        next()
    else
        throw new errors.NotAuthenticatedError()


module.exports.needsToBeAuthorizedSupervisor = (request, response, next) ->
    if request.session.authenticated and _.contains(['admin', 'manager'], request.session.role)
        next()
    else
        throw new errors.NotAuthenticatedError()


module.exports.detectScope = (request, response, next) ->
    if request.session.authenticated
        if request.session.role == 'team'
            request.scope = 'teams'
        else if _.contains ['admin', 'manager'], request.session.role
            request.scope = 'supervisors'
        else
            request.scope = null
    else
        request.scope = 'guests'
    next()


module.exports.main = session
    store: new RedisStore client: redis.createClient()
    secret: process.env.SESSION_SECRET
    resave: no
    saveUninitialized: no
    name: 'themis-session-id'
    cookie:
        domain: 'api.' + process.env.DOMAIN
        path: '/'
        httpOnly: yes
        secure: no
        expires: no
