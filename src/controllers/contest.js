const Contest = require('../models/contest')

const { InternalError, InvalidStateTransitionError } = require('../utils/errors')
const { CONTEST_INITIAL, CONTEST_STARTED, CONTEST_PAUSED, CONTEST_FINISHED } = require('../utils/constants')
const logger = require('../utils/logger')

const EventController = require('./event')
const UpdateContestEvent = require('../events/update-contest')

const queue = require('../utils/queue')

class ContestController {
  static get (callback) {
    Contest
      .query()
      .first()
      .then(function (contest) {
        callback(null, contest)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static fetch () {
    return new Promise(function (resolve, reject) {
      Contest
        .query()
        .first()
        .then(function (contest) {
          resolve(contest)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  static isValidTransition (curState, newState) {
    if (curState === newState) {
      return true
    }

    const initialToStarted = curState === CONTEST_INITIAL && newState === CONTEST_STARTED
    const startedToPaused = curState === CONTEST_STARTED && newState === CONTEST_PAUSED
    const pausedToStarted = curState === CONTEST_PAUSED && newState === CONTEST_STARTED
    const startedToFinished = curState === CONTEST_STARTED && newState === CONTEST_FINISHED
    const pausedToFinished = curState === CONTEST_FINISHED && newState === CONTEST_FINISHED

    return initialToStarted || startedToPaused || pausedToStarted || startedToFinished || pausedToFinished
  }

  static manualUpdate (newState, startsAt, finishesAt, callback) {
    ContestController.internalUpdate(newState, startsAt, finishesAt, callback)
  }

  static checkUpdate (callback) {
    ContestController.get(function (err, contest) {
      if (err) {
        callback(err, null)
      } else {
        if (contest) {
          const now = new Date()
          if (contest.state === CONTEST_INITIAL && contest.startsAt != null && now.getTime() >= contest.startsAt.getTime()) {
            ContestController.internalUpdate(CONTEST_STARTED, contest.startsAt, contest.finishesAt, callback)
          } else if ((contest.state === CONTEST_STARTED || contest.state === CONTEST_PAUSED) && contest.finishesAt != null && now.getTime() >= contest.finishesAt.getTime()) {
            ContestController.internalUpdate(CONTEST_FINISHED, contest.startsAt, contest.finishesAt, callback)
          } else {
            callback(null, null)
          }
        } else {
          callback(null, null)
        }
      }
    })
  }

  static internalUpdate (newState, startsAt, finishesAt, callback) {
    ContestController.get(function (err, contest) {
      if (err) {
        callback(err, null)
      } else {
        let curState = CONTEST_INITIAL
        if (contest) {
          curState = contest.state
        }

        if (!ContestController.isValidTransition(curState, newState)) {
          callback(new InvalidStateTransitionError(), null)
        } else {
          if (contest) {
            Contest
              .query()
              .patchAndFetchById(contest.id, {
                state: newState,
                startsAt,
                finishesAt
              })
              .then(function (updatedContest) {
                EventController.push(new UpdateContestEvent(updatedContest))
                if (curState === CONTEST_INITIAL && newState === CONTEST_STARTED) {
                  queue('notifyStartCompetition').add({})
                } else if ((curState === CONTEST_STARTED || curState === CONTEST_PAUSED) && newState === CONTEST_FINISHED) {
                  queue('notifyFinishCompetition').add({})
                }
                callback(null, updatedContest)
              })
              .catch(function (err) {
                logger.error(err)
                callback(new InternalError(), null)
              })
          } else {
            Contest
              .query()
              .insert({
                state: newState,
                startsAt,
                finishesAt
              })
              .then(function (contest) {
                EventController.push(new UpdateContestEvent(contest))
                if (curState === CONTEST_INITIAL && newState === CONTEST_STARTED) {
                  queue('notifyStartCompetition').add({})
                } else if ((curState === CONTEST_STARTED || curState === CONTEST_PAUSED) && newState === CONTEST_FINISHED) {
                  queue('notifyFinishCompetition').add({})
                }
                callback(null, contest)
              })
              .catch(function (err) {
                logger.error(err)
                callback(new InternalError(), null)
              })
          }
        }
      }
    })
  }
}

module.exports = ContestController
