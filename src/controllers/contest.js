import _ from 'underscore'

import Contest from '../models/contest'
import TeamScore from '../models/team-score'
import TaskCategory from '../models/task-category'
import Task from '../models/task'
import TeamTaskProgress from '../models/team-task-progress'

import TeamController from '../controllers/team'
import TeamTaskProgressController from '../controllers/team-task-progress'
import TaskController from '../controllers/task'

import { ContestNotInitializedError, InternalError } from '../utils/errors'
import constants from '../utils/constants'
import logger from '../utils/logger'

import publish from '../utils/publisher'
import BaseEvent from '../utils/events'

import contestSerializer from '../serializers/contest'
import teamScoreSerializer from '../serializers/team-score'

import when_ from 'when'
import async from 'async'


class UpdateContestEvent extends BaseEvent {
  constructor(contest) {
    super('updateContest')
    let contestData = contestSerializer(contest)
    this.data.supervisors = contestData
    this.data.teams = contestData
    this.data.guests = contest
  }
}


class UpdateTeamScoreEvent extends BaseEvent {
  constructor(teamScore) {
    super('updateTeamScore')
    let teamScoreData = teamScoreSerializer(teamScore)
    this.data.supervisors = teamScoreData
    this.data.teams = teamScoreData
    this.data.guests = teamScoreData
  }
}


class ContestController {
  static get(callback) {
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

  static getScores(callback) {
    TeamController.listQualified((err, teams) => {
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
    })
  }

  static update(state, startsAt, finishesAt, callback) {
    ContestController.get((err, contest) => {
      if (err) {
        callback(err, null)
      } else {
        let alwaysResolves = function() {
          let deferred = when_.defer()
          deferred.resolve()
          return deferred.promise
        }

        let promises = []
        if (state === constants.CONTEST_INITIAL) {
          if (contest && contest.state !== state) {
            let removeTaskCategories = function() {
              let deferred = when_.defer()
              TaskCategory
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

            let removeTasks = function() {
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

            let removeTeamScores = function() {
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

            let removeTeamTaskProgressEntries = function() {
              let deferred = when_.defer()

              TeamTaskProgress
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

            promises.push(removeTeamTaskProgressEntries())
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
                  publish('realtime', new UpdateContestEvent(updatedContest))
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
                  publish('realtime', new UpdateContestEvent(contest))
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

  static updateScores(callback) {
    TeamController.listQualified((err, teams) => {
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
                TeamTaskProgressController.list((err, teamTaskProgress) => {
                  if (err) {
                    callback(err)
                  } else {
                    let recalculateTeamScore = function (team, next) {
                      let teamScore = _.findWhere(teamScores, { teamId: team.id })
                      let taskProgressEntries = _.where(teamTaskProgress, { teamId: team.id })
                      let totalScore = 0
                      let lastUpdatedAt = null

                      let countedTaskIds = []

                      for (let taskProgress of taskProgressEntries) {
                        let task = _.findWhere(tasks, { id: taskProgress.taskId })
                        if (task && !_.contains(countedTaskIds, taskProgress.taskId)) {
                          countedTaskIds.push(taskProgress.taskId)
                          totalScore += task.value
                          if (lastUpdatedAt) {
                            if (lastUpdatedAt.getTime() < taskProgress.createdAt.getTime()) {
                              lastUpdatedAt = taskProgress.createdAt
                            }
                          } else {
                            lastUpdatedAt = taskProgress.createdAt
                          }
                        }
                      }

                      let needCreate = (!teamScore && totalScore > 0)
                      let needUpdate = (teamScore && totalScore !== teamScore.score)

                      if (needUpdate) {
                        TeamScore
                          .query()
                          .patchAndFetchById(teamScore.id, {
                            score: totalScore,
                            updatedAt: lastUpdatedAt
                          })
                          .then((updatedTeamScore) => {
                            next(null, updatedTeamScore)
                            publish('realtime', new UpdateTeamScoreEvent(updatedTeamScore))
                          })
                          .catch((err) => {
                            logger.error(err)
                            next(err, null)
                          })
                      } else if (needCreate) {
                        TeamScore
                          .query()
                          .insert({
                            teamId: team.id,
                            score: totalScore,
                            updatedAt: lastUpdatedAt
                          })
                          .then((teamScore) => {
                            next(null, teamScore)
                            publish('realtime', new UpdateTeamScoreEvent(teamScore))
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
    })
  }
}


export default ContestController
