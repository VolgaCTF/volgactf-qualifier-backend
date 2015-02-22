express = require 'express'

redis = require './utils/redis'
client = redis.createClient()

teamRouter = require './routes/team'
taskRouter = require './routes/task'
categoryRouter = require './routes/category'

app = express()

app.use (request, response, next) ->
    response.header 'Access-Control-Allow-Origin', process.env.CORS_ORIGIN
    next()

app.use '/team', teamRouter
app.use '/task', taskRouter
app.use '/category', categoryRouter

module.exports = app
