const Event = require('../models/event')
const logger = require('../utils/logger')
const eventPublisher = require('../utils/publisher')

class EventController {
  static push (eventObject, callback = null) {
    Event
      .query()
      .insert({
        type: eventObject.type,
        data: eventObject.data,
        createdAt: new Date()
      })
      .then(function (event) {
        eventPublisher.push(event)
        if (callback) {
          callback(null, event)
        }
      })
      .catch(function (err) {
        logger.error(err)
        if (callback) {
          callback(err, null)
        }
      })
  }

  static indexNew (lastEventId, callback) {
    Event
      .query()
      .where('id', '>', lastEventId)
      .orderBy('id')
      .then(function (events) {
        callback(null, events)
      })
      .catch(function (err) {
        logger.error(err)
        callback(err, null)
      })
  }
}

module.exports = EventController
