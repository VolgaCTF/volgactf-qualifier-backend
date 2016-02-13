import Log from '../models/log'
import logger from '../utils/logger'
import { InternalError } from '../utils/errors'
import publish from '../utils/publisher'
import BaseEvent from '../utils/events'

import logSerializer from '../serializers/log'

class CreateLogEvent extends BaseEvent {
  constructor (log) {
    super('createLog')
    let logData = logSerializer(log)
    this.data.supervisors = logData
  }
}

class LogController {
  static pushLog (eventName, data, callback = null) {
    Log
      .query()
      .insert({
        event: eventName,
        createdAt: new Date(),
        data: data
      })
      .then((log) => {
        publish('realtime', new CreateLogEvent(log))
        if (callback) {
          callback(null)
        }
      })
      .catch((err) => {
        logger.error(err)
        if (callback) {
          callback(new InternalError())
        }
      })
  }

  static list (callback) {
    Log
      .query()
      .then((logs) => {
        callback(null, logs)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default LogController
