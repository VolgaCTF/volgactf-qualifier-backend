import TeamProvider from './team'
import ContestProvider from './contest'
import Event from '../models/event'
import _ from 'underscore'
import constants from '../utils/constants'
import TeamTaskHitAttemptController from './team-task-hit-attempt'
import TeamTaskHitController from './team-task-hit'
import TeamTaskReviewController from './team-task-review'
import CountryProvider from './country'
import TaskProvider from './task'
import CategoryController from './category'
import TaskCategoryController from './task-category'

class StatController {
  static getAllData (callback) {
    TeamProvider.index((err, teams) => {
      if (err) {
        callback(err, null)
      } else {
        ContestProvider.get((err2, contest) => {
          if (err2) {
            callback(err2, null)
          } else {
            if (contest && contest.startsAt && contest.finishesAt) {
              Event
                .query()
                .then((events_) => {
                  TeamTaskHitAttemptController.index((err4, teamTaskHitAttempts) => {
                    if (err4) {
                      callback(err4, null)
                    } else {
                      TeamTaskHitController.list((err5, teamTaskHits) => {
                        if (err5) {
                          callback(err5, null)
                        } else {
                          TeamTaskReviewController.index((err6, teamTaskReviews) => {
                            if (err6) {
                              callback(err6, null)
                            } else {
                              CountryProvider.index((err7, countries) => {
                                if (err7) {
                                  callback(err7, null)
                                } else {
                                  TaskProvider.index((err8, tasks) => {
                                    if (err8) {
                                      callback(err8, null)
                                    } else {
                                      CategoryController.index((err9, categories) => {
                                        if (err9) {
                                          callback(err9, null)
                                        } else {
                                          let taskIds = []
                                          _.each(tasks, (task) => {
                                            taskIds.push(task.id)
                                          })

                                          TaskCategoryController.indexByTasks(taskIds, (err10, taskCategories) => {
                                            if (err10) {
                                              callback(err10, null)
                                            } else {
                                              callback(null, {
                                                teams: teams,
                                                countries: countries,
                                                contest: contest,
                                                events: events_,
                                                categories: categories,
                                                tasks: tasks,
                                                taskCategories: taskCategories,
                                                teamTaskHitAttempts: teamTaskHitAttempts,
                                                teamTaskHits: teamTaskHits,
                                                teamTaskReviews: teamTaskReviews
                                              })
                                            }
                                          })
                                        }
                                      })
                                    }
                                  }, true)
                                }
                              })
                            }
                          })
                        }
                      })
                    }
                  })
                })
                .catch((err3) => {
                  callback(err3, null)
                })
            } else {
              callback('Contest not found!', null)
            }
          }
        })
      }
    })
  }

  static getStats (callback) {
    const result = {
      teams: {
        total: 0,
        qualified: 0,
        disqualified: 0,
        signedInDuringContest: 0,
        attemptedToSolveTasks: 0,
        solvedAtLeastOneTask: 0,
        reviewedAtLeastOneTask: 0
      },
      countries: {
      },
      tasks: {
      }
    }

    StatController.getAllData((err, data) => {
      if (err) {
        callback(err, null)
      } else {
        result.teams.total = data.teams.length
        result.teams.qualified = _.filter(data.teams, (team) => {
          return team.isQualified()
        }).length
        result.teams.disqualified = _.filter(data.teams, (team) => {
          return team.disqualified
        }).length

        const contestStartTimestamp = data.contest.startsAt.getTime()
        const contestFinishTimestamp = data.contest.finishesAt.getTime()

        const signInEvents = _.filter(data.events, (event) => {
          const timestamp = event.createdAt.getTime()
          return event.type === constants.EVENT_LOGIN_TEAM && timestamp >= contestStartTimestamp && timestamp <= contestFinishTimestamp
        })

        const setSignedIn = new Set()
        for (const signInEvent of signInEvents) {
          setSignedIn.add(signInEvent.data.supervisors.id)
        }
        result.teams.signedInDuringContest = setSignedIn.size

        const setHitAttempt = new Set()
        for (const teamTaskHitAttempt of data.teamTaskHitAttempts) {
          setHitAttempt.add(teamTaskHitAttempt.teamId)
        }

        const setHit = new Set()
        for (const teamTaskHit of data.teamTaskHits) {
          setHitAttempt.add(teamTaskHit.teamId)
          setHit.add(teamTaskHit.teamId)
        }
        result.teams.attemptedToSolveTasks = setHitAttempt.size
        result.teams.solvedAtLeastOneTask = setHit.size

        const setReview = new Set()
        for (const teamTaskReview of data.teamTaskReviews) {
          setReview.add(teamTaskReview.teamId)
        }
        result.teams.reviewedAtLeastOneTask = setReview.size

        const qualifiedTeams = _.filter(data.teams, (team) => {
          return team.isQualified()
        })
        result.countries = _.countBy(qualifiedTeams, (team) => {
          return _.findWhere(data.countries, { id: team.countryId }).name
        })

        for (const task of data.tasks) {
          const taskReviews = _.filter(data.teamTaskReviews, (review) => {
            return review.taskId === task.id
          })

          let averageRating = null
          if (taskReviews.length > 0) {
            averageRating = _.reduce(taskReviews, (memo, review) => {
              return memo + review.rating
            }, 0.0) / taskReviews.length
          }

          let opened = null
          for (const event of data.events) {
            if (event.type === constants.EVENT_OPEN_TASK && event.data.supervisors.id === task.id) {
              opened = event.createdAt
            }
          }

          let flagsSubmitted = 0
          const hitAttempts = _.filter(data.teamTaskHitAttempts, (hitAttempt) => {
            return hitAttempt.taskId === task.id
          })
          flagsSubmitted += hitAttempts.length

          const hits = _.filter(data.teamTaskHits, (hit) => {
            return hit.taskId === task.id
          })
          const teamsSolved = hits.length

          flagsSubmitted += teamsSolved

          let firstSubmit = null
          let lastSubmit = null
          if (hitAttempts.length > 0) {
            firstSubmit = _.min(hitAttempts, (hitAttempt) => {
              return hitAttempt.createdAt.getTime()
            }).createdAt
            lastSubmit = _.max(hitAttempts, (hitAttempt) => {
              return hitAttempt.createdAt.getTime()
            }).createdAt
          }

          let firstSolved = null
          let lastSolved = null
          if (hits.length > 0) {
            firstSolved = _.min(hits, (hit) => {
              return hit.createdAt.getTime()
            }).createdAt
            lastSolved = _.max(hits, (hit) => {
              return hit.createdAt.getTime()
            }).createdAt

            if (firstSubmit !== null && firstSolved.getTime() < firstSubmit.getTime()) {
              firstSubmit = firstSolved
            }

            if (lastSubmit !== null && lastSubmit.getTime() > lastSubmit.getTime()) {
              lastSubmit = lastSolved
            }
          }

          let categories = []
          const taskCategories = _.filter(data.taskCategories, (taskCategory) => {
            return taskCategory.taskId === task.id
          })
          _.each(taskCategories, (taskCategory) => {
            const category = _.findWhere(data.categories, { id: taskCategory.categoryId })
            if (category) {
              categories.push(category.title)
            }
          })

          result.tasks[task.title] = {
            value: task.value,
            categories: categories,
            opened: opened,
            firstSubmit: firstSubmit,
            lastSubmit: lastSubmit,
            flagsSubmitted: flagsSubmitted,
            teamsSolved: teamsSolved,
            firstSolved: firstSolved,
            lastSolved: lastSolved,
            reviews: taskReviews.length,
            averageRating: averageRating
          }
        }
        callback(null, result)
      }
    })
  }
}

export default StatController
