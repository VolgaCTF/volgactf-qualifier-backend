express = require 'express'
bodyParser = require 'body-parser'
logger = require './utils/logger'
cookieParser = require 'cookie-parser'

teamRouter = require './routes/team'
postRouter = require './routes/post'

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


app.get '/identity', (request, response, next) ->
    token = tokenUtil.encode tokenUtil.generate 32
    request.session.token = token

    if request.session.authenticated?
        if request.session.role is 'team'
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
        else if _.contains ['admin', 'manager'], request.session.role
            SupervisorController.get request.session.identityID, (err, supervisor) ->
                if err?
                    next err
                else
                    response.json
                        id: request.session.identityID
                        role: supervisor.rights
                        name: supervisor.username
                        token: token
        else
            throw new errors.UnknownIdentityError()
    else
        response.json
            role: 'guest'
            token: token


app.get '/events', (request, response, next) ->
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

    eventStream.on 'message', pushEventFunc

    request.once 'end', ->
        eventStream.removeListener 'message', pushEventFunc


app.use (err, request, response, next) ->
    if err instanceof errors.BaseError
        response.status err.getHttpStatus()
        response.json err.message
    else
        logger.error err
        response.status 500
        response.json 'Internal Server Error'

module.exports = app
