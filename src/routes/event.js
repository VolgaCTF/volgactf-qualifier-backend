const express = require('express')
const _ = require('underscore')
const logger = require('../utils/logger')

const EventController = require('../controllers/event')
const router = express.Router()

const { needsToBeAuthorizedSupervisor } = require('../middleware/session')
const { getSupervisor } = require('../middleware/supervisor')
const supervisorEventSerializer = require('../serializers/supervisor-event')

router.get('/index', needsToBeAuthorizedSupervisor, getSupervisor, function (request, response, next) {
  let fetchThreshold = new Date()
  if (request.query.hasOwnProperty('fetch_threshold')) {
    const val = parseInt(request.query.fetch_threshold, 10)
    if (!isNaN(val)) {
      fetchThreshold = new Date(val)
    }
  }

  let page = 1
  if (request.query.hasOwnProperty('page')) {
    const val = parseInt(request.query.page, 10)
    if (!isNaN(val)) {
      page = val
    }
  }

  const pageSize = request.supervisor.event_history_page_size || 250

  Promise
  .all([
    EventController.countHistoryEntries(fetchThreshold),
    EventController.indexHistoryEntries(fetchThreshold, page, pageSize)
  ])
  .then(function (values) {
    response.json({
      page: page,
      pageSize: pageSize,
      numEntries: values[0],
      entries: _.map(values[1], supervisorEventSerializer)
    })
  })
  .catch(function (err) {
    logger.error(err)
    next(err)
  })
})

module.exports = router
