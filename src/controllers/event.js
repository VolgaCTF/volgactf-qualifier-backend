const Event = require('../models/event')
const logger = require('../utils/logger')
const eventPublisher = require('../utils/publisher')
const { EVENT_UPDATE_TEAM_RANKINGS } = require('../utils/constants')

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

  static countHistoryEntries (fetchThreshold) {
    return new Promise(function (resolve, reject) {
      Event
        .query()
        .where('createdAt', '<', fetchThreshold)
        .whereNot('type', EVENT_UPDATE_TEAM_RANKINGS)
        .whereRaw("json_typeof(data -> 'supervisors') != 'null'")
        .count()
        .then(function (r) {
          resolve(parseInt(r[0].count, 10))
        })
        .catch(function (err) {
          logger.error(err)
          reject(err)
        })
    })
  }

  static indexHistoryEntries (fetchThreshold, page, pageSize) {
    return new Promise(function (resolve, reject) {
      Event
        .query()
        .where('createdAt', '<', fetchThreshold)
        .whereNot('type', EVENT_UPDATE_TEAM_RANKINGS)
        .whereRaw("json_typeof(data -> 'supervisors') != 'null'")
        .orderBy('createdAt')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .then(function (entries) {
          resolve(entries)
        })
        .catch(function (err) {
          logger.error(err)
          reject(err)
        })
    })
  }
}

module.exports = EventController
