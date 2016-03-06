import _ from 'underscore'

import Contest from '../models/contest'
import TeamScore from '../models/team-score'
import Category from '../models/category'
import Task from '../models/task'
import TeamTaskHit from '../models/team-task-hit'

import TeamController from '../controllers/team'
import TeamTaskHitController from '../controllers/team-task-hit'
import TaskController from '../controllers/task'

import { InternalError } from '../utils/errors'
import constants from '../utils/constants'
import logger from '../utils/logger'

import EventController from './event'
import UpdateContestEvent from '../events/update-contest'
import UpdateTeamScoreEvent from '../events/update-team-score'

import when_ from 'when'
import async from 'async'

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

  static getScores (callback) {
    TeamController.index((err, teams) => {
      if (err) {
        callback(err, null)
      } else {
        TeamScore
          .query()
          .then((teamScores) => {
            callback(null, _.map(teams, (team) => {
              let teamScore = _.findWhere(teamScores, { teamId: team.id })
              if (!teamScore) {
                teamScore = {
                  teamId: team.id,
                  score: 0,
                  updatedAt: null
                }
              }

              return teamScore
            }))
          })
          .catch((err) => {
            logger.error(err)
            callback(err, null)
          })
      }
    }, true)
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

  static updateScores (callback) {
    TeamController.index((err, teams) => {
      if (err) {
        callback(err)
      } else {
        TeamScore
          .query()
          .then((teamScores) => {
            TaskController.list((err, tasks) => {
              if (err) {
                callback(err)
              } else {
                TeamTaskHitController.list((err, teamTaskHits) => {
                  if (err) {
                    callback(err)
                  } else {
                    let recalculateTeamScore = function (team, next) {
                      let taskHitEntries = _.where(teamTaskHits, { teamId: team.id })
                      let totalScore = 0
                      let lastUpdatedAt = null

                      for (let taskHit of taskHitEntries) {
                        let task = _.findWhere(tasks, { id: taskHit.taskId })
                        if (task) {
                          totalScore += task.value
                          if (lastUpdatedAt) {
                            if (lastUpdatedAt.getTime() < taskHit.createdAt.getTime()) {
                              lastUpdatedAt = taskHit.createdAt
                            }
                          } else {
                            lastUpdatedAt = taskHit.createdAt
                          }
                        }
                      }

                      if (totalScore > 0 && lastUpdatedAt) {
                        TeamScore
                          .raw(
                            `INSERT INTO team_scores AS t ("teamId", "score", "updatedAt")
                            VALUES (?, ?, ?)
                            ON CONFLICT ("teamId") DO
                            UPDATE SET "score" = EXCLUDED."score", "updatedAt" = EXCLUDED."updatedAt"
                            WHERE t."score" != EXCLUDED."score"
                            RETURNING *`,
                            [team.id, totalScore, lastUpdatedAt]
                          )
                          .then((response) => {
                            next(null, null)
                            if (response.rowCount === 1) {
                              EventController.push(new UpdateTeamScoreEvent(response.rows[0]))
                            }
                          })
                          .catch((err) => {
                            logger.error(err)
                            next(err, null)
                          })
                      } else {
                        next(null, null)
                      }
                    }

                    async.mapLimit(teams, 5, recalculateTeamScore, (err, results) => {
                      if (err) {
                        logger.error(err)
                        callback(new InternalError())
                      } else {
                        callback(null)
                      }
                    })
                  }
                })
              }
            })
          })
          .catch((err) => {
            logger.error(err)
            callback(err)
          })
      }
    }, true)
  }
}

export default ContestController
