import Log from '../models/log'
import logger from '../utils/logger'
import errors from '../utils/errors'
import publisher from '../utils/publisher'
import _ from 'underscore'
import BaseEvent from '../utils/events'

import logSerializer from '../serializers/log'


class CreateLogEvent extends BaseEvent {
  constructor(log) {
    super('createLog')
    let logData = logSerializer(log)
    this.data.supervisors = logData
  }
}


class LogController {
  static pushLog(eventName, data, callback = null) {
    let log = new Log({
      event: eventName,
      createdAt: new Date(),
      data: data
    })

    log.save((err, log) => {
      if (err) {
        logger.error(err)
        if (callback) {
          callback(new errors.InternalError())
        }
      } else {
        publisher.publish('realtime', new CreateLogEvent(log))
        if (callback) {
          callback(null)
        }
      }
    })
  }

  static list(callback) {
    Log.find((err, logs) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError(), null)
      } else {
        callback(null, logs)
      }
    })
  }
}


export default LogController
