import mongoose from 'mongoose'
import logger from './logger'
import autoIncrement from 'mongoose-auto-increment'


mongoose.connect(process.env.MONGODB_URI)
autoIncrement.initialize(mongoose.connection)

mongoose.connection
  .on('error', () => {
    logger.info('Connection error')
  })
  .once('open', (callback) => {
    logger.info('Connected to MongoDB server')
  })

export default mongoose
