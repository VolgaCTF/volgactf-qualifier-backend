import Event from '../models/event'
import logger from '../utils/logger'
import eventPublisher from '../utils/publisher'

export default class EventController {
  static push (eventObject, callback = null) {
    Event
      .query()
      .insert({
        type: eventObject.type,
        data: eventObject.data,
        createdAt: new Date()
      })
      .then((event) => {
        eventPublisher.push(event)
        if (callback) {
          callback(null, event)
        }
      })
      .catch((err) => {
        logger.error(err)
        if (callback) {
          callback(err, null)
        }
      })
  }

  static list (lastEventId, callback) {
    Event
      .query()
      .where('id', '>', lastEventId)
      .orderBy('id')
      .then((events) => {
        callback(null, events)
      })
      .catch((err) => {
        logger.error(err)
        callback(err, null)
      })
  }
}
