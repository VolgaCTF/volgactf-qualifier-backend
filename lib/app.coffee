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
            login: constraints.login
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
                        request.session.name = supervisor.username
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
    identity =
        id: null
        role: 'guest'
        name: null

    if request.session.authenticated?
        identity.id = request.session.identityID
        identity.role = request.session.role
        identity.name = request.session.name
        if identity.role is 'team' and 'emailConfirmed' of request.session
            identity.emailConfirmed = request.session.emailConfirmed

    response.json identity

module.exports = app
