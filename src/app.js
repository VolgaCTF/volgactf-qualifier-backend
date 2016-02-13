import express from 'express'
import logger from './utils/logger'
import cookieParser from 'cookie-parser'

import apiRouter from './routes/api'

import { BaseError } from './utils/errors'

import sessionMiddleware from './middleware/session'

let app = express()
app.set('x-powered-by', false)
app.set('trust proxy', 'loopback')

app.use(cookieParser())
app.use(sessionMiddleware)

app.use('/api', apiRouter)

app.use((err, request, response, next) => {
  if (err instanceof BaseError) {
    response.status(err.getHttpStatus())
    response.json(err.message)
  } else {
    logger.error(err)
    response.status(500)
    response.json('Internal Server Error')
  }
})

export default app
