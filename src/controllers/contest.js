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
    Contest.findOne({}, (err, contest) => {
      if (err) {
        logger.error(err)
        callback(new ContestNotInitializedError(), null)
      } else {
        // Warning: this can be null. This is a normal situation.
        callback(null, contest)
      }
    })
  }

  static getScores(callback) {
    TeamController.listQualified((err, teams) => {
      if (err) {
        callback(err, null)
      } else {
        TeamScore.find({}, (err, teamScores) => {
          if (err) {
            callback(err, null)
          } else {
            let result = _.map(teams, (team) => {
              let teamScore = _.findWhere(teamScores, { teamId: team._id })
              if (!teamScore) {
                teamScore = {
                  teamId: team._id,
                  score: 0,
                  updatedAt: null
                }
              }

              return teamScore
            })

            callback(null, result)
          }
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
              TaskCategory.remove({}, (err) => {
                if (err) {
                  logger.error(err)
                  deferred.reject(new InternalError())
                } else {
                  deferred.resolve()
                }
              })
              return deferred.promise
            }

            promises.push(removeTaskCategories())

            let removeTasks = function() {
              let deferred = when_.defer()
              Task.remove({}, (err) => {
                if (err) {
                  logger.error(err)
                  deferred.reject(err)
                } else {
                  deferred.resolve()
                }
              })

              return deferred.promise
            }

            promises.push(removeTasks())

            let removeTeamScores = function() {
              let deferred = when_.defer()
              TeamScore.remove({}, (err) => {
                if (err) {
                  logger.error(err)
                  deferred.reject(err)
                } else {
                  deferred.resolve()
                }
              })
              return deferred.promise
            }

            promises.push(removeTeamScores())

            let removeTeamTaskProgressEntries = function() {
              let deferred = when_.defer()
              TeamTaskProgress.remove({}, (err) => {
                if (err) {
                  logger.error(err)
                  deferred.reject(err)
                } else {
                  deferred.resolve()
                }
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
              contest.state = state
              contest.startsAt = startsAt
              contest.finishesAt = finishesAt
            } else {
              contest = new Contest({
                state: state,
                startsAt: startsAt,
                finishesAt: finishesAt
              })
            }

            contest.save((err, contest) => {
              if (err) {
                logger.error(err)
                callback(new InternalError(), null)
              } else {
                callback(null, contest)
                publish('realtime', new UpdateContestEvent(contest))
              }
            })
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
        TeamScore.find({}, (err, teamScores) => {
          if (err) {
            callback(err)
          } else {
            TaskController.list((err, tasks) => {
              if (err) {
                callback(err)
              } else {
                TeamTaskProgressController.list((err, teamTaskProgress) => {
                  if (err) {
                    callback(err)
                  } else {
                    let recalculateTeamScore = function (team, next) {
                      let teamScore = _.findWhere(teamScores, { teamId: team._id })
                      let taskProgressEntries = _.where(teamTaskProgress, { teamId: team._id })
                      let totalScore = 0
                      let lastUpdatedAt = null

                      let countedTaskIds = []

                      for (let taskProgress of taskProgressEntries) {
                        let task = _.findWhere(tasks, { _id: taskProgress.taskId })
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
                        teamScore.score = totalScore
                        teamScore.updatedAt = lastUpdatedAt
                      } else if (needCreate) {
                        teamScore = new TeamScore({
                          teamId: team._id,
                          score: totalScore,
                          updatedAt: lastUpdatedAt
                        })
                      }

                      if (needUpdate || needCreate) {
                        teamScore.save((err, teamScore) => {
                          if (err) {
                            next(err, null)
                          } else {
                            next(null, teamScore)
                            publish('realtime', new UpdateTeamScoreEvent(teamScore))
                          }
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
          }
        })
      }
    })
  }
}


export default ContestController
