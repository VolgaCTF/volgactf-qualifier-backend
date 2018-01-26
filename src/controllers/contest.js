import Contest from '../models/contest'

import { InternalError, InvalidStateTransitionError } from '../utils/errors'
import constants from '../utils/constants'
import logger from '../utils/logger'

import EventController from './event'
import UpdateContestEvent from '../events/update-contest'

import queue from '../utils/queue'

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

  static isValidTransition (curState, newState) {
    if (curState === newState) {
      return true
    }

    let initialToStarted = curState === constants.CONTEST_INITIAL && newState === constants.CONTEST_STARTED
    let startedToPaused = curState === constants.CONTEST_STARTED && newState === constants.CONTEST_PAUSED
    let pausedToStarted = curState === constants.CONTEST_PAUSED && newState === constants.CONTEST_STARTED
    let startedToFinished = curState === constants.CONTEST_STARTED && newState === constants.CONTEST_FINISHED
    let pausedToFinished = curState === constants.CONTEST_FINISHED && newState === constants.CONTEST_FINISHED

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
          if (contest.state === constants.CONTEST_INITIAL && contest.startsAt != null && now.getTime() >= contest.startsAt.getTime()) {
            ContestController.internalUpdate(constants.CONTEST_STARTED, contest.startsAt, contest.finishesAt, callback)
          } else if ((contest.state === constants.CONTEST_STARTED || contest.state === constants.CONTEST_PAUSED) && contest.finishesAt != null && now.getTime() >= contest.finishesAt.getTime()) {
            ContestController.internalUpdate(constants.CONTEST_FINISHED, contest.startsAt, contest.finishesAt, callback)
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
        let curState = constants.CONTEST_INITIAL
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
                startsAt: startsAt,
                finishesAt: finishesAt
              })
              .then(function (updatedContest) {
                EventController.push(new UpdateContestEvent(updatedContest))
                if (curState === constants.CONTEST_INITIAL && newState === constants.CONTEST_STARTED) {
                  queue('notifyStartCompetition').add({})
                } else if ((curState === constants.CONTEST_STARTED || curState === constants.CONTEST_PAUSED) && newState === constants.CONTEST_FINISHED) {
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
                startsAt: startsAt,
                finishesAt: finishesAt
              })
              .then(function (contest) {
                EventController.push(new UpdateContestEvent(contest))
                if (curState === constants.CONTEST_INITIAL && newState === constants.CONTEST_STARTED) {
                  queue('notifyStartCompetition').add({})
                } else if ((curState === constants.CONTEST_STARTED || curState === constants.CONTEST_PAUSED) && newState === constants.CONTEST_FINISHED) {
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

export default ContestController
