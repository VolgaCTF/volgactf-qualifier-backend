import Contest from '../models/contest'
import TeamScore from '../models/team-score'
import Category from '../models/category'
import Task from '../models/task'
import TeamTaskHit from '../models/team-task-hit'

import { InternalError } from '../utils/errors'
import constants from '../utils/constants'
import logger from '../utils/logger'

import EventController from './event'
import UpdateContestEvent from '../events/update-contest'

import when_ from 'when'

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

  static update (state, startsAt, finishesAt, callback) {
    ContestController.get((err, contest) => {
      if (err) {
        callback(err, null)
      } else {
        let alwaysResolves = function () {
          let deferred = when_.defer()
          deferred.resolve()
          return deferred.promise
        }

        let promises = []
        if (state === constants.CONTEST_INITIAL) {
          if (contest && contest.state !== state) {
            let removeTaskCategories = function () {
              let deferred = when_.defer()
              Category
                .query()
                .delete()
                .then((numDeleted) => {
                  deferred.resolve()
                })
                .catch((err) => {
                  logger.error(err)
                  deferred.reject(new InternalError())
                })

              return deferred.promise
            }

            promises.push(removeTaskCategories())

            let removeTasks = function () {
              let deferred = when_.defer()

              Task
                .query()
                .delete()
                .then((numDeleted) => {
                  deferred.resolve()
                })
                .catch((err) => {
                  logger.error(err)
                  deferred.reject(err)
                })

              return deferred.promise
            }

            promises.push(removeTasks())

            let removeTeamScores = function () {
              let deferred = when_.defer()

              TeamScore
                .query()
                .delete()
                .then((numDeleted) => {
                  deferred.resolve()
                })
                .catch((err) => {
                  logger.error(err)
                  deferred.reject(err)
                })

              return deferred.promise
            }

            promises.push(removeTeamScores())

            let removeTeamTaskHits = function () {
              let deferred = when_.defer()

              TeamTaskHit
                .query()
                .delete()
                .then((numDeleted) => {
                  deferred.resolve()
                })
                .catch((err) => {
                  logger.error(err)
                  deferred.reject(err)
                })

              return deferred.promise
            }

            promises.push(removeTeamTaskHits())
          } else {
            promises.push(alwaysResolves())
          }
        } else {
          promises.push(alwaysResolves())
        }

        when_
          .all(promises)
          .then(() => {
            if (contest) {
              Contest
                .query()
                .patchAndFetchById(contest.id, {
                  state: state,
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
                  state: state,
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
          })
          .catch((err) => {
            logger.error(err)
            callback(new InternalError(), null)
          })
      }
    })
  }
}

export default ContestController
