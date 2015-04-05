express = require 'express'
bodyParser = require 'body-parser'
logger = require './utils/logger'
cookieParser = require 'cookie-parser'
session = require 'express-session'

teamRouter = require './routes/team'
# taskRouter = require './routes/task'
# categoryRouter = require './routes/category'
postRouter = require './routes/post'

SupervisorController = require './controllers/supervisor'

redis = require './utils/redis'
RedisStore = require('connect-redis') session

Validator = require 'validator.js'
validator = new Validator.Validator()
constraints = require './utils/constraints'
_ = require 'underscore'
TeamController = require './controllers/team'

errors = require './utils/errors'
BaseError = errors.BaseError
ValidationError = errors.ValidationError
AlreadyAuthenticatedError = errors.AlreadyAuthenticatedError
InvalidSupervisorCredentialsError = errors.InvalidSupervisorCredentialsError
NotAuthenticatedError = errors.NotAuthenticatedError
UnknownIdentityError = errors.UnknownIdentityError

subscriber = require './utils/subscriber'

app = express()

app.set 'x-powered-by', no

app.use (request, response, next) ->
    response.header 'Access-Control-Allow-Origin', 'http://' + process.env.DOMAIN
    response.header 'Access-Control-Allow-Credentials', 'true'
    next()

app.use cookieParser()
app.use session
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

app.use '/team', teamRouter
app.use '/post', postRouter
# app.use '/task', taskRouter
# app.use '/category', categoryRouter


urlencodedParser = bodyParser.urlencoded extended: no

app.post '/login', urlencodedParser, (request, response, next) ->
    if request.session.authenticated?
        throw new AlreadyAuthenticatedError()

    loginConstraints =
        username: constraints.username
        password: constraints.password

    validationResult = validator.validate request.body, loginConstraints
    unless validationResult is true
        throw new ValidationError()

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
                next new InvalidSupervisorCredentialsError()

app.post '/signout', (request, response, next) ->
    unless request.session.authenticated?
        throw new NotAuthenticatedError()

    request.session.authenticated = no
    request.session.destroy (err) ->
        if err?
            next err
        else
            response.json success: yes

app.get '/identity', (request, response, next) ->
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
        else if _.contains ['admin', 'manager'], request.session.role
            SupervisorController.get request.session.identityID, (err, supervisor) ->
                if err?
                    next err
                else
                    response.json
                        id: request.session.identityID
                        role: supervisor.rights
                        name: supervisor.username
        else
            throw new UnknownIdentityError()
    else
        response.json role: 'guest'


realtime =
    connections: []

app.get '/events', (request, response, next) ->
    request.socket.setTimeout Infinity

    response.writeHead 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': 'http://' + process.env.DOMAIN,
        'Access-Control-Allow-Credentials': 'true'
    }
    response.write '\n'

    logger.info 'Client opened event stream'
    realtime.connections.push response

    request.on 'close', ->
        logger.info 'Client closed event stream'
        ndx = realtime.connections.indexOf response
        if ndx > -1
            realtime.connections.splice ndx, 1


subscriber.subscribe 'realtime'
subscriber.on 'message', (channel, message) ->
    now = new Date()
    obj = JSON.parse message
    name = obj.name
    obj = _.omit obj, 'name'
    message = JSON.stringify obj
    logger.info "Event #{name} - #{message}"
    logger.info "Sending event to #{realtime.connections.length} clients"

    for connection in realtime.connections
        connection.write "id: #{now.getTime()}\n"
        connection.write "event: #{name}\n"
        connection.write "data: #{message}\n\n"


app.use (err, request, response, next) ->
    if err instanceof BaseError
        response.status err.getHttpStatus()
        response.json err.message
    else
        logger.error err
        response.status 500
        response.json 'Internal Server Error'

module.exports = app
