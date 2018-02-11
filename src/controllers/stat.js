const TeamProvider = require('./team')
const ContestProvider = require('./contest')
const Event = require('../models/event')
const _ = require('underscore')
const { EVENT_LOGIN_TEAM, EVENT_OPEN_TASK } = require('../utils/constants')
const TeamTaskHitAttemptController = require('./team-task-hit-attempt')
const TeamTaskHitController = require('./team-task-hit')
const TeamTaskReviewController = require('./team-task-review')
const CountryProvider = require('./country')
const TaskProvider = require('./task')
const CategoryController = require('./category')
const TaskCategoryController = require('./task-category')
const { ContestNotFoundError } = require('../utils/errors')

class StatController {
  static getAllData (callback) {
    TeamProvider.index(function (err, teams) {
      if (err) {
        callback(err, null)
      } else {
        ContestProvider.get(function (err2, contest) {
          if (err2) {
            callback(err2, null)
          } else {
            if (contest && contest.startsAt && contest.finishesAt) {
              Event
                .query()
                .then(function (events_) {
                  TeamTaskHitAttemptController.index(function (err4, teamTaskHitAttempts) {
                    if (err4) {
                      callback(err4, null)
                    } else {
                      TeamTaskHitController.list(function (err5, teamTaskHits) {
                        if (err5) {
                          callback(err5, null)
                        } else {
                          TeamTaskReviewController.index(function (err6, teamTaskReviews) {
                            if (err6) {
                              callback(err6, null)
                            } else {
                              CountryProvider.index(function (err7, countries) {
                                if (err7) {
                                  callback(err7, null)
                                } else {
                                  TaskProvider.index(function (err8, tasks) {
                                    if (err8) {
                                      callback(err8, null)
                                    } else {
                                      CategoryController.index(function (err9, categories) {
                                        if (err9) {
                                          callback(err9, null)
                                        } else {
                                          const taskIds = []
                                          _.each(tasks, function (task) {
                                            taskIds.push(task.id)
                                          })

                                          TaskCategoryController.indexByTasks(taskIds, function (err10, taskCategories) {
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
                .catch(function (err3) {
                  callback(err3, null)
                })
            } else {
              callback(new ContestNotFoundError(), null)
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

    StatController.getAllData(function (err, data) {
      if (err) {
        callback(err, null)
      } else {
        result.teams.total = data.teams.length
        result.teams.qualified = _.filter(data.teams, function (team) {
          return team.isQualified()
        }).length
        result.teams.disqualified = _.filter(data.teams, function (team) {
          return team.disqualified
        }).length

        const contestStartTimestamp = data.contest.startsAt.getTime()
        const contestFinishTimestamp = data.contest.finishesAt.getTime()

        const signInEvents = _.filter(data.events, function (event) {
          const timestamp = event.createdAt.getTime()
          return event.type === EVENT_LOGIN_TEAM && timestamp >= contestStartTimestamp && timestamp <= contestFinishTimestamp
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

        const qualifiedTeams = _.filter(data.teams, function (team) {
          return team.isQualified()
        })
        result.countries = _.countBy(qualifiedTeams, function (team) {
          return _.findWhere(data.countries, { id: team.countryId }).name
        })

        for (const task of data.tasks) {
          const taskReviews = _.filter(data.teamTaskReviews, function (review) {
            return review.taskId === task.id
          })

          let averageRating = null
          if (taskReviews.length > 0) {
            averageRating = _.reduce(taskReviews, function (memo, review) {
              return memo + review.rating
            }, 0.0) / taskReviews.length
          }

          let opened = null
          for (const event of data.events) {
            if (event.type === EVENT_OPEN_TASK && event.data.supervisors.id === task.id) {
              opened = event.createdAt
            }
          }

          let flagsSubmitted = 0
          const hitAttempts = _.filter(data.teamTaskHitAttempts, function (hitAttempt) {
            return hitAttempt.taskId === task.id
          })
          flagsSubmitted += hitAttempts.length

          const hits = _.filter(data.teamTaskHits, function (hit) {
            return hit.taskId === task.id
          })
          const teamsSolved = hits.length

          flagsSubmitted += teamsSolved

          let firstSubmit = null
          let lastSubmit = null
          if (hitAttempts.length > 0) {
            firstSubmit = _.min(hitAttempts, function (hitAttempt) {
              return hitAttempt.createdAt.getTime()
            }).createdAt
            lastSubmit = _.max(hitAttempts, function (hitAttempt) {
              return hitAttempt.createdAt.getTime()
            }).createdAt
          }

          let firstSolved = null
          let lastSolved = null
          if (hits.length > 0) {
            firstSolved = _.min(hits, function (hit) {
              return hit.createdAt.getTime()
            }).createdAt
            lastSolved = _.max(hits, function (hit) {
              return hit.createdAt.getTime()
            }).createdAt

            if (firstSubmit !== null && firstSolved.getTime() < firstSubmit.getTime()) {
              firstSubmit = firstSolved
            }

            if (lastSubmit !== null && lastSubmit.getTime() > lastSubmit.getTime()) {
              lastSubmit = lastSolved
            }
          }

          const categories = []
          const taskCategories = _.filter(data.taskCategories, function (taskCategory) {
            return taskCategory.taskId === task.id
          })
          _.each(taskCategories, function (taskCategory) {
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

module.exports = StatController
