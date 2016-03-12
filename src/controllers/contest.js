import Contest from '../models/contest'

import { InternalError, InvalidStateTransitionError } from '../utils/errors'
import constants from '../utils/constants'
import logger from '../utils/logger'

import EventController from './event'
import UpdateContestEvent from '../events/update-contest'

class ContestController {
  static get (callback) {
    Contest
      .query()
      .first()
      .then((contest) => {
        callback(null, contest)
      })
      .catch((err) => {
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

  static update (newState, startsAt, finishesAt, callback) {
    ContestController.get((err, contest) => {
      if (err) {
        callback(err, null)
      } else {
        let curState = constants.CONTEST_INITIAL
        if (contest) {
          curState = contest.state
        }

        if (!this.isValidTransition(curState, newState)) {
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
              .then((updatedContest) => {
                callback(null, updatedContest)
                EventController.push(new UpdateContestEvent(updatedContest))
              })
              .catch((err) => {
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
              .then((contest) => {
                callback(null, contest)
                EventController.push(new UpdateContestEvent(contest))
              })
              .catch((err) => {
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
