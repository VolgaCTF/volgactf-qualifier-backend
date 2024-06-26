const TeamTaskReview = require('../models/team-task-review')
const TeamTaskHit = require('../models/team-task-hit')
const logger = require('../utils/logger')
const { InternalError, TaskReviewAlreadyGivenError, TaskReviewNotEligibleError, TaskReviewNotFoundError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const EventController = require('./event')
const CreateTeamTaskReviewEvent = require('../events/create-team-task-review')
const queue = require('../utils/queue')

class TeamTaskReviewController {
  static isTeamTaskUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'team_task_reviews_ndx_team_task_unique')
  }

  static index (callback) {
    TeamTaskReview
      .query()
      .then(function (teamTaskReviews) {
        callback(null, teamTaskReviews)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static fetchByTask (taskId) {
    return new Promise(function (resolve, reject) {
      TeamTaskReview
        .query()
        .where('taskId', taskId)
        .then(function (teamTaskReviews) {
          resolve(teamTaskReviews)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  static indexByTask (taskId, callback) {
    TeamTaskReview
      .query()
      .where('taskId', taskId)
      .then(function (teamTaskReviews) {
        callback(null, teamTaskReviews)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static fetchByTeam (teamId) {
    return new Promise(function (resolve, reject) {
      TeamTaskReview
        .query()
        .where('teamId', teamId)
        .then(function (teamTaskReviews) {
          resolve(teamTaskReviews)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  static indexByTeam (teamId, callback) {
    TeamTaskReview
      .query()
      .where('teamId', teamId)
      .then(function (teamTaskReviews) {
        callback(null, teamTaskReviews)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static indexByTeamAndTask (teamId, taskId, callback) {
    TeamTaskReview
      .query()
      .where('taskId', taskId)
      .andWhere('teamId', teamId)
      .then(function (teamTaskReviews) {
        callback(null, teamTaskReviews)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static create (teamId, taskId, rating, comment, callback) {
    TeamTaskHit
      .query()
      .where('taskId', taskId)
      .andWhere('teamId', teamId)
      .then(function (teamTaskHits) {
        if (teamTaskHits.length === 1) {
          TeamTaskReview
            .query()
            .insert({
              teamId,
              taskId,
              rating,
              comment,
              createdAt: new Date()
            })
            .then(function (teamTaskReview) {
              callback(null, teamTaskReview)
              queue('newTaskReviewQueue').add({
                reviewId: teamTaskReview.id
              })
              EventController.push(new CreateTeamTaskReviewEvent(teamTaskReview))
            })
            .catch(function (err) {
              if (TeamTaskReviewController.isTeamTaskUniqueConstraintViolation(err)) {
                callback(new TaskReviewAlreadyGivenError(), null)
              } else {
                logger.error(err)
                callback(new InternalError(), null)
              }
            })
        } else {
          callback(new TaskReviewNotEligibleError(), null)
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static get (id) {
    return new Promise(function (resolve, reject) {
      TeamTaskReview
        .query()
        .where('id', id)
        .first()
        .then(function (teamTaskReview) {
          if (teamTaskReview) {
            resolve(teamTaskReview)
          } else {
            reject(new TaskReviewNotFoundError())
          }
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }
}

module.exports = TeamTaskReviewController
