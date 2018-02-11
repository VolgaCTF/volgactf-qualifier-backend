const express = require('express')
const logger = require('./utils/logger')
const cookieParser = require('cookie-parser')

const apiRouter = require('./routes/api')

const { BaseError } = require('./utils/errors')

const { session } = require('./middleware/session')

const app = express()
app.set('x-powered-by', false)
app.set('trust proxy', 'loopback')

app.use(cookieParser())
app.use(session)

app.use('/api', apiRouter)

app.use(function (err, request, response, next) {
  if (err instanceof BaseError) {
    response.status(err.getHttpStatus())
    response.json(err.message)
  } else {
    logger.error(err)
    response.status(500)
    response.json('Internal Server Error')
  }
})

module.exports = app
