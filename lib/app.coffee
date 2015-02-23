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

app = express()

app.use (request, response, next) ->
    response.header 'Access-Control-Allow-Origin', process.env.CORS_ORIGIN
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
        domain: 'api.2015.volgactf-dev.org'
        path: '/'
        httpOnly: yes
        secure: false
        maxAge: 600000

app.use '/team', teamRouter
app.use '/task', taskRouter
app.use '/category', categoryRouter

urlencodedParser = bodyParser.urlencoded extended: no

app.post '/login', urlencodedParser, (request, response) ->
    if request.session.authenticated?
        response.status(400).json 'Already autheticated!'
    else
        SupervisorController.login request.body.username, request.body.password, (err, supervisor) ->
            if err?
                logger.error err
                response.status(400).json 'Invalid username or password!'
            else
                if supervisor?
                    logger.info "Correct password for #{supervisor.username}"
                    request.session.authenticated = yes
                    request.session.role = supervisor.rights
                    request.session.id = supervisor._id
                    response.status(200).json 'Login successful!'
                else
                    logger.error "Invalid password for #{request.body.username}"
                    response.status(400).json 'Invalid username or password!'


app.get '/identity', (request, response) ->
    identity =
        role: 'guest'
        id: null

    if request.session.authenticated?
        identity.role = request.session.role
        identity.id = request.session.id

    response.json identity

module.exports = app
