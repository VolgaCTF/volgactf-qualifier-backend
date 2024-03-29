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
const taskValueController = require('./task-value')
const moment = require('moment')

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
                .where('type', EVENT_LOGIN_TEAM)
                .orWhere('type', EVENT_OPEN_TASK)
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
                                              taskValueController
                                                .getByTasks(taskIds)
                                                .then(function (taskValues) {
                                                  callback(null, {
                                                    teams,
                                                    countries,
                                                    contest,
                                                    events: events_,
                                                    categories,
                                                    tasks,
                                                    taskValues,
                                                    taskCategories,
                                                    teamTaskHitAttempts,
                                                    teamTaskHits,
                                                    teamTaskReviews
                                                  })
                                                })
                                                .catch(function (err11) {
                                                  callback(err11, null)
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
      countryDistribution: [],
      countryDistributionPopular: [],
      tasks: {
      },
      teamSubmitDistribution: [],
      teamHitDistribution: [],
      teamReviewDistribution: [],
      signupDistribution: [],
      signinDistribution: []
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

        const signupMap = new Map()
        _.filter(data.teams, function (team) {
          return team.isQualified()
        }).forEach(function (entry) {
          const reducedTimestamp = moment(entry.createdAt).hours(0).minutes(0).seconds(0).milliseconds(0).valueOf()
          if (!signupMap.has(reducedTimestamp)) {
            signupMap.set(reducedTimestamp, new Set())
          }
          signupMap.get(reducedTimestamp).add(entry.id)
        })

        const contestStartTimestamp = data.contest.startsAt.getTime()
        const contestFinishTimestamp = data.contest.finishesAt.getTime()

        const signInEvents = _.filter(data.events, function (event) {
          const timestamp = event.createdAt.getTime()
          return event.type === EVENT_LOGIN_TEAM && timestamp >= contestStartTimestamp && timestamp <= contestFinishTimestamp
        })

        const signinMap = new Map()
        const setSignedIn = new Set()

        for (const signInEvent of signInEvents) {
          const reducedTimestamp = moment(signInEvent.createdAt).minutes(0).seconds(0).milliseconds(0).valueOf()
          if (!signinMap.has(reducedTimestamp)) {
            signinMap.set(reducedTimestamp, new Set())
          }

          let teamId = null
          if (Object.hasOwn(signInEvent.data.supervisors, 'id')) {
            teamId = signInEvent.data.supervisors.id
          } else if (Object.hasOwn(signInEvent.data.supervisors, 'team') && Object.hasOwn(signInEvent.data.supervisors.team, 'id')) {
            teamId = signInEvent.data.supervisors.team.id
          }

          if (teamId) {
            setSignedIn.add(teamId)
            signinMap.get(reducedTimestamp).add(teamId)
          }
        }
        result.teams.signedInDuringContest = setSignedIn.size

        const teamSubmitMap = new Map()
        const teamHitMap = new Map()

        const setHitAttempt = new Set()
        for (const teamTaskHitAttempt of data.teamTaskHitAttempts) {
          setHitAttempt.add(teamTaskHitAttempt.teamId)
          if (!teamSubmitMap.has(teamTaskHitAttempt.teamId)) {
            teamSubmitMap.set(teamTaskHitAttempt.teamId, new Set())
          }
          teamSubmitMap.get(teamTaskHitAttempt.teamId).add(teamTaskHitAttempt.taskId)
        }

        const setHit = new Set()
        for (const teamTaskHit of data.teamTaskHits) {
          setHitAttempt.add(teamTaskHit.teamId)
          setHit.add(teamTaskHit.teamId)

          if (!teamSubmitMap.has(teamTaskHit.teamId)) {
            teamSubmitMap.set(teamTaskHit.teamId, new Set())
          }
          teamSubmitMap.get(teamTaskHit.teamId).add(teamTaskHit.taskId)

          if (!teamHitMap.has(teamTaskHit.teamId)) {
            teamHitMap.set(teamTaskHit.teamId, new Set())
          }
          teamHitMap.get(teamTaskHit.teamId).add(teamTaskHit.taskId)
        }
        result.teams.attemptedToSolveTasks = setHitAttempt.size
        result.teams.solvedAtLeastOneTask = setHit.size

        const setReview = new Set()
        const teamReviewMap = new Map()

        for (const teamTaskReview of data.teamTaskReviews) {
          setReview.add(teamTaskReview.teamId)

          if (!teamReviewMap.has(teamTaskReview.teamId)) {
            teamReviewMap.set(teamTaskReview.teamId, new Set())
          }
          teamReviewMap.get(teamTaskReview.teamId).add(teamTaskReview.taskId)
        }
        result.teams.reviewedAtLeastOneTask = setReview.size

        const qualifiedTeams = _.filter(data.teams, function (team) {
          return team.isQualified()
        })

        const countryMap = new Map(_.pairs(_.countBy(qualifiedTeams, function (team) {
          return team.countryId
        })))

        const countryDistribution = []
        countryMap.forEach(function (value, key, map) {
          const countryId = parseInt(key, 10)
          countryDistribution.push({
            countryId,
            countryName: _.findWhere(data.countries, { id: countryId }).name,
            numTeams: value
          })
        })

        result.countryDistribution = _.sortBy(countryDistribution, 'numTeams').reverse()

        const topCountries = _.map(_.first(result.countryDistribution, 15), function (entry) {
          return entry.countryId
        })
        const countryDistributionPopular = []
        const otherCountries = {
          countryId: -1,
          countryName: 'Other',
          numTeams: 0
        }
        countryMap.forEach(function (value, key, map) {
          const countryId = parseInt(key, 10)
          if (topCountries.indexOf(countryId) !== -1) {
            countryDistributionPopular.push({
              countryId,
              countryName: _.findWhere(data.countries, { id: countryId }).name,
              numTeams: value
            })
          } else {
            otherCountries.numTeams += value
          }
        })
        countryDistributionPopular.push(otherCountries)
        result.countryDistributionPopular = _.sortBy(countryDistributionPopular, 'numTeams').reverse()

        const teamSubmitDistributionMap = new Map()
        for (const [teamId, taskIds] of teamSubmitMap) {
          const numTasks = taskIds.size
          if (!teamSubmitDistributionMap.has(numTasks)) {
            teamSubmitDistributionMap.set(numTasks, new Set())
          }
          teamSubmitDistributionMap.get(numTasks).add(teamId)
        }
        const teamSubmitDistribution = []
        teamSubmitDistributionMap.forEach(function (value, key, map) {
          teamSubmitDistribution.push({ numTasks: key, numTeams: value.size })
        })
        result.teamSubmitDistribution = _.sortBy(teamSubmitDistribution, 'numTasks')

        const teamHitDistributionMap = new Map()
        for (const [teamId, taskIds] of teamHitMap) {
          const numTasks = taskIds.size
          if (!teamHitDistributionMap.has(numTasks)) {
            teamHitDistributionMap.set(numTasks, new Set())
          }
          teamHitDistributionMap.get(numTasks).add(teamId)
        }
        const teamHitDistribution = []
        teamHitDistributionMap.forEach(function (value, key, map) {
          teamHitDistribution.push({ numTasks: key, numTeams: value.size })
        })
        result.teamHitDistribution = _.sortBy(teamHitDistribution, 'numTasks')

        const teamReviewDistributionMap = new Map()
        for (const [teamId, taskIds] of teamReviewMap) {
          const numTasks = taskIds.size
          if (!teamReviewDistributionMap.has(numTasks)) {
            teamReviewDistributionMap.set(numTasks, new Set())
          }
          teamReviewDistributionMap.get(numTasks).add(teamId)
        }
        const teamReviewDistribution = []
        teamReviewDistributionMap.forEach(function (value, key, map) {
          teamReviewDistribution.push({ numTasks: key, numTeams: value.size })
        })
        result.teamReviewDistribution = _.sortBy(teamReviewDistribution, 'numTasks')

        const signinDistribution = []
        signinMap.forEach(function (value, key, map) {
          signinDistribution.push({ timestamp: key, numTeams: value.size })
        })
        result.signinDistribution = _.sortBy(signinDistribution, 'timestamp')

        const signupDistribution = []
        signupMap.forEach(function (value, key, map) {
          signupDistribution.push({ timestamp: key, numTeams: value.size })
        })
        result.signupDistribution = _.sortBy(signupDistribution, 'timestamp')

        const tasks = []
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

          const taskHitAttemptDistribution = new Map()
          const taskHitDistribution = new Map()
          const taskReviewDistribution = new Map()

          let iterDate = moment(data.contest.startsAt).minutes(0).seconds(0).milliseconds(0).valueOf()
          while (iterDate <= contestFinishTimestamp) {
            taskHitAttemptDistribution.set(iterDate, new Set())
            taskHitDistribution.set(iterDate, new Set())
            taskReviewDistribution.set(iterDate, new Set())
            iterDate = moment(iterDate).add(1, 'hours').valueOf()
          }

          for (const hitAttempt of hitAttempts) {
            const reducedTimestamp = moment(hitAttempt.createdAt).minutes(0).seconds(0).milliseconds(0).valueOf()
            taskHitAttemptDistribution.get(reducedTimestamp).add(`ha-${hitAttempt.id}`)
          }

          for (const hit of hits) {
            const reducedTimestamp = moment(hit.createdAt).minutes(0).seconds(0).milliseconds(0).valueOf()
            taskHitAttemptDistribution.get(reducedTimestamp).add(`h-${hit.id}`)
            taskHitDistribution.get(reducedTimestamp).add(`h-${hit.id}`)
          }

          for (const review of taskReviews) {
            const reducedTimestamp = moment(review.createdAt).minutes(0).seconds(0).milliseconds(0).valueOf()
            taskReviewDistribution.get(reducedTimestamp).add(review.id)
          }

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
          let firstSolvedTeam = null
          let lastSolved = null
          if (hits.length > 0) {
            const firstSolvedEntry = _.min(hits, function (hit) {
              return hit.createdAt.getTime()
            })
            firstSolved = firstSolvedEntry.createdAt
            firstSolvedTeam = _.findWhere(data.teams, { id: firstSolvedEntry.teamId }).name
            lastSolved = _.max(hits, function (hit) {
              return hit.createdAt.getTime()
            }).createdAt

            if (!_.isNull(firstSubmit) && firstSolved.getTime() < firstSubmit.getTime()) {
              firstSubmit = firstSolved
            }

            if (!_.isNull(lastSubmit) && lastSolved.getTime() > lastSubmit.getTime()) {
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

          const taskHitAttemptDistributionList = []
          taskHitAttemptDistribution.forEach(function (value, key) {
            taskHitAttemptDistributionList.push({ timestamp: key, numHitAttempts: value.size })
          })

          const taskHitDistributionList = []
          taskHitDistribution.forEach(function (value, key) {
            taskHitDistributionList.push({ timestamp: key, numHits: value.size })
          })

          const taskReviewDistributionList = []
          taskReviewDistribution.forEach(function (value, key) {
            taskReviewDistributionList.push({ timestamp: key, numReviews: value.size })
          })

          tasks.push({
            title: task.title,
            value: _.findWhere(data.taskValues, { taskId: task.id }).value,
            categories,
            opened,
            firstSubmit,
            lastSubmit,
            flagsSubmitted,
            teamsSolved,
            firstSolved,
            firstSolvedTeam,
            lastSolved,
            reviews: taskReviews.length,
            averageRating,
            hitAttemptDistribution: _.sortBy(taskHitAttemptDistributionList, 'timestamp'),
            hitDistribution: _.sortBy(taskHitDistributionList, 'timestamp'),
            reviewDistribution: _.sortBy(taskReviewDistributionList, 'timestamp'),
            reviewsDetailed: _.map(_.sortBy(taskReviews, 'createdAt'), function (taskReview) {
              return {
                team: _.findWhere(data.teams, { id: taskReview.teamId }).name,
                rating: taskReview.rating,
                comment: taskReview.comment,
                timestamp: taskReview.createdAt
              }
            })
          })
        }

        result.tasks = _.sortBy(tasks, 'opened')

        callback(null, result)
      }
    })
  }
}

module.exports = StatController
