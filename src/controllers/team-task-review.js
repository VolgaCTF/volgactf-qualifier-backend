import TeamTaskReview from '../models/team-task-review'
import TeamTaskHit from '../models/team-task-hit'
import logger from '../utils/logger'
import { InternalError, TaskReviewAlreadyGivenError, TaskReviewNotEligibleError } from '../utils/errors'
import constants from '../utils/constants'
import EventController from './event'
import CreateTeamTaskReviewEvent from '../events/create-team-task-review'

class TeamTaskReviewController {
  static isTeamTaskUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'team_task_reviews_ndx_team_task_unique')
  }

  static indexByTask (taskId, callback) {
    TeamTaskReview
      .query()
      .where('taskId', taskId)
      .then((teamTaskReviews) => {
        callback(null, teamTaskReviews)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static indexByTeam (teamId, callback) {
    TeamTaskReview
      .query()
      .where('teamId', teamId)
      .then((teamTaskReviews) => {
        callback(null, teamTaskReviews)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static indexByTeamAndTask (teamId, taskId, callback) {
    TeamTaskReview
      .query()
      .where('taskId', taskId)
      .andWhere('teamId', teamId)
      .then((teamTaskReviews) => {
        callback(null, teamTaskReviews)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static create (teamId, taskId, rating, comment, callback) {
    TeamTaskHit
      .query()
      .where('taskId', taskId)
      .andWhere('teamId', teamId)
      .then((teamTaskHits) => {
        if (teamTaskHits.length === 1) {
          TeamTaskReview
            .query()
            .insert({
              teamId: teamId,
              taskId: taskId,
              rating: rating,
              comment: comment,
              createdAt: new Date()
            })
            .then((teamTaskReview) => {
              callback(null, teamTaskReview)
              EventController.push(new CreateTeamTaskReviewEvent(teamTaskReview))
            })
            .catch((err) => {
              if (this.isTeamTaskUniqueConstraintViolation(err)) {
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
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TeamTaskReviewController
