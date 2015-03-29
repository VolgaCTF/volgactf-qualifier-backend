express = require 'express'
bodyParser = require 'body-parser'
logger = require './utils/logger'
cookieParser = require 'cookie-parser'
session = require 'express-session'

teamRouter = require './routes/team'
taskRouter = require './routes/task'
categoryRouter = require './routes/category'

SupervisorController = require './controllers/supervisor'

redis = require './utils/redis'
RedisStore = require('connect-redis') session

Validator = require 'validator.js'
validator = new Validator.Validator()
constraints = require './utils/constraints'
_ = require 'underscore'
TeamController = require './controllers/team'

app = express()

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
app.use '/task', taskRouter
app.use '/category', categoryRouter

urlencodedParser = bodyParser.urlencoded extended: no

app.post '/login', urlencodedParser, (request, response) ->
    if request.session.authenticated?
        response.status(400).json 'Already autheticated!'
    else
        loginConstraints =
            username: constraints.username
            password: constraints.password

        validationResult = validator.validate request.body, loginConstraints
        if validationResult is true
            SupervisorController.login request.body.username, request.body.password, (err, supervisor) ->
                if err?
                    logger.error err
                    response.status(400).json 'Invalid username or password!'
                else
                    if supervisor?
                        request.session.authenticated = yes
                        request.session.identityID = supervisor.id
                        request.session.role = supervisor.rights
                        response.status(200).json 'Login successful!'
                    else
                        response.status(400).json 'Invalid username or password!'
        else
            response.status(400).json 'Validation error!'

app.post '/signout', (request, response) ->
    if request.session.authenticated?
        request.session.authenticated = no
        request.session.destroy (err) ->
            response.json ''
    else
        response.status(400).json 'Not authenticated!'


app.get '/identity', (request, response) ->
    if request.session.authenticated?
        if request.session.role is 'team'
            TeamController.get request.session.identityID, (err, team) ->
                if err?
                    response.status(400).json err
                else
                    response.json
                        id: request.session.identityID
                        role: 'team'
                        name: team.name
                        emailConfirmed: team.emailConfirmed
        else if _.contains ['admin', 'manager'], request.session.role
            SupervisorController.get request.session.identityID, (err, supervisor) ->
                if err?
                    response.status(400).json err
                else
                    response.json
                        id: request.session.identityID
                        role: supervisor.rights
                        name: supervisor.username
        else
            response.status(400).json 'Invalid identity!'
    else
        response.json role: 'guest'

module.exports = app
