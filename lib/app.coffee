express = require 'express'
bodyParser = require 'body-parser'
logger = require './utils/logger'
cookieParser = require 'cookie-parser'

teamRouter = require './routes/team'
postRouter = require './routes/post'
contestRouter = require './routes/contest'
taskRouter = require './routes/task'
thirdPartyRouter = require './routes/third-party'

SupervisorController = require './controllers/supervisor'

Validator = require 'validator.js'
validator = new Validator.Validator()
constraints = require './utils/constraints'
_ = require 'underscore'
TeamController = require './controllers/team'

errors = require './utils/errors'

sessionMiddleware = require './middleware/session'
tokenUtil = require './utils/token'
securityMiddleware = require './middleware/security'
corsMiddleware = require './middleware/cors'

eventStream = require './controllers/event-stream'

app = express()
app.set 'x-powered-by', no

app.use corsMiddleware
app.use cookieParser()
app.use sessionMiddleware.main

app.use '/team', teamRouter
app.use '/post', postRouter
app.use '/contest', contestRouter
app.use '/task', taskRouter
app.use '/third-party', thirdPartyRouter


urlencodedParser = bodyParser.urlencoded extended: no

app.post '/login', securityMiddleware.checkToken, sessionMiddleware.needsToBeUnauthorized, urlencodedParser, (request, response, next) ->
    loginConstraints =
        username: constraints.username
        password: constraints.password

    validationResult = validator.validate request.body, loginConstraints
    unless validationResult is true
        throw new errors.ValidationError()

    SupervisorController.login request.body.username, request.body.password, (err, supervisor) ->
        if err?
            next err
        else
            if supervisor?
                request.session.authenticated = yes
                request.session.identityID = supervisor.id
                request.session.role = supervisor.rights
                response.json success: yes
            else
                next new errors.InvalidSupervisorCredentialsError()


app.post '/signout', securityMiddleware.checkToken, sessionMiddleware.needsToBeAuthorized, (request, response, next) ->
    request.session.authenticated = no
    request.session.destroy (err) ->
        if err?
            next err
        else
            response.json success: yes


app.get '/identity', sessionMiddleware.detectScope, (request, response, next) ->
    token = tokenUtil.encode tokenUtil.generate 32
    request.session.token = token

    switch request.scope
        when 'supervisors'
            SupervisorController.get request.session.identityID, (err, supervisor) ->
                if err?
                    next err
                else
                    response.json
                        id: request.session.identityID
                        role: supervisor.rights
                        name: supervisor.username
                        token: token
        when 'teams'
            TeamController.get request.session.identityID, (err, team) ->
                if err?
                    next err
                else
                    response.json
                        id: request.session.identityID
                        role: 'team'
                        name: team.name
                        emailConfirmed: team.emailConfirmed
                        token: token
        when 'guests'
            response.json
                role: 'guest'
                token: token
        else
            throw new errors.UnknownIdentityError()


app.get '/events', sessionMiddleware.detectScope, (request, response, next) ->
    unless request.scope?
        throw new errors.UnknownIdentityError()

    request.socket.setTimeout Infinity

    response.writeHead 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': 'http://' + process.env.DOMAIN,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers', 'X-CSRF-Token'
    }
    response.write '\n'

    pushEventFunc = (data) ->
        response.write data

    mainChannel = "message:#{request.scope}"
    if request.scope is 'teams'
        extraChannel = "message:team#{request.session.identityID}"
    else
        extraChannel = null

    eventStream.on mainChannel, pushEventFunc
    if extraChannel?
        eventStream.on extraChannel, pushEventFunc

    request.once 'close', ->
        eventStream.removeListener mainChannel, pushEventFunc
        if extraChannel?
            eventStream.removeListener extraChannel, pushEventFunc


app.use (err, request, response, next) ->
    if err instanceof errors.BaseError
        response.status err.getHttpStatus()
        response.json err.message
    else
        logger.error err
        response.status 500
        response.json 'Internal Server Error'

module.exports = app
