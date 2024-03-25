const express = require('express')

const teamRouter = require('../routes/team')
const postRouter = require('../routes/post')
const contestRouter = require('../routes/contest')
const taskRouter = require('../routes/task')
const categoryRouter = require('../routes/category')
const thirdPartyRouter = require('../routes/third-party')
const countryRouter = require('../routes/country')
const supervisorRouter = require('../routes/supervisor')

const SupervisorController = require('../controllers/supervisor')

const TeamController = require('../controllers/team')

const { UnknownIdentityError } = require('../utils/errors')

const { detectScope } = require('../middleware/session')
const { issueToken } = require('../middleware/security')
const { getLastEventId } = require('../middleware/last-event-id')

const eventStream = require('../controllers/event-stream')
const EventController = require('../controllers/event')
const logger = require('../utils/logger')
const eventNameList = require('../utils/event-name-list')
const _ = require('underscore')

const webhookRouter = require('../routes/webhook')
const { BaseError } = require('../utils/errors')

const remoteCheckerRouter = require('../routes/remote-checker')
const eventRouter = require('../routes/event')

const router = express.Router()

router.use('/team', teamRouter)
router.use('/post', postRouter)
router.use('/contest', contestRouter)
router.use('/task', taskRouter)
router.use('/category', categoryRouter)
router.use('/third-party', thirdPartyRouter)
router.use('/country', countryRouter)
router.use('/supervisor', supervisorRouter)
router.use('/webhook', webhookRouter)
router.use('/remote_checker', remoteCheckerRouter)
router.use('/event', eventRouter)

router.get('/identity', detectScope, issueToken, function (request, response, next) {
  const token = request.session.token

  if (request.scope.isSupervisor()) {
    SupervisorController.get(request.session.identityID, function (err, supervisor) {
      if (err) {
        next(err)
      } else {
        response.json({
          id: request.session.identityID,
          role: supervisor.rights,
          name: supervisor.username,
          token
        })
      }
    })
  } else if (request.scope.isTeam()) {
    TeamController.get(request.session.identityID, function (err, team) {
      if (err) {
        next(err)
      } else {
        response.json({
          id: request.session.identityID,
          role: 'team',
          name: team.name,
          emailConfirmed: team.emailConfirmed,
          token
        })
      }
    })
  } else if (request.scope.isGuest()) {
    response.json({
      role: 'guest',
      token
    })
  } else {
    next(new UnknownIdentityError())
  }
})

function getLatestEvents (lastEventId, callback) {
  if (lastEventId != null) {
    EventController.indexNew(lastEventId, function (err, events) {
      if (err) {
        logger.error(err)
        callback(err, null)
      } else {
        callback(null, events)
      }
    })
  } else {
    callback(null, [])
  }
}

router.get('/stream', detectScope, getLastEventId, function (request, response, next) {
  request.socket.setTimeout(0)

  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive'
  })
  response.write('\n')

  getLatestEvents(request.lastEventId, function (err, events) {
    if (err) {
      logger.error(err)
      next(err)
    } else {
      const writeFunc = function (data) {
        response.write(data)
      }

      for (const event of events) {
        if (request.scope.isSupervisor() && event.data.supervisors) {
          writeFunc(eventStream.format(
            event.id,
            eventNameList.getName(event.type),
            5000,
            _.extend(event.data.supervisors, { __metadataCreatedAt: event.createdAt.getTime() })
          ))
        } else if (request.scope.isTeam()) {
          if (event.data.teams) {
            writeFunc(eventStream.format(
              event.id,
              eventNameList.getName(event.type),
              5000,
              _.extend(event.data.teams, { __metadataCreatedAt: event.createdAt.getTime() })
            ))
          } else if (event.data.team && Object.hasOwn(event.data.team, request.session.identityID)) {
            writeFunc(eventStream.format(
              event.id,
              eventNameList.getName(event.type),
              5000,
              _.extend(event.data.team[request.session.identityID], { __metadataCreatedAt: event.createdAt.getTime() })
            ))
          }
        } else if (request.scope.isGuest()) {
          writeFunc(eventStream.format(
            event.id,
            eventNameList.getName(event.type),
            5000,
            _.extend(event.data.guests, { __metadataCreatedAt: event.createdAt.getTime() })
          ))
        }
      }

      const mainChannel = `message:${request.scope.toString()}`
      let extraChannel = null
      if (request.scope.isTeam()) {
        extraChannel = `message:team-${request.session.identityID}`
      }

      eventStream.on(mainChannel, writeFunc)
      if (extraChannel) {
        eventStream.on(extraChannel, writeFunc)
      }

      const pingInterval = setInterval(function () {
        writeFunc('event: ping\ndata: ping\n\n')
      }, 5000)

      request.once('close', function () {
        eventStream.removeListener(mainChannel, writeFunc)
        if (extraChannel) {
          eventStream.removeListener(extraChannel, writeFunc)
        }
        if (pingInterval) {
          clearInterval(pingInterval)
        }
      })
    }
  })
})

router.get('*', detectScope, issueToken, function (request, response, next) {
  response.status(404).json('Not Found')
})

router.use(function (err, request, response, next) {
  if (err instanceof BaseError) {
    response
      .status(err.getHttpStatus())
      .json(err.message)
  } else {
    logger.error(err)
    response
      .status(500)
      .json('Internal Server Error')
  }
})

module.exports = router
