const TeamTaskHit = require('../models/team-task-hit')
const logger = require('../utils/logger')
const { InternalError, TaskAlreadySolvedError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const EventController = require('./event')
const CreateTeamTaskHitEvent = require('../events/create-team-task-hit')

class TeamTaskHitController {
  static isTeamTaskUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'team_task_hits_ndx_team_task_unique')
  }

  static create (teamId, task, callback) {
    TeamTaskHit
      .query()
      .insert({
        teamId: teamId,
        taskId: task.id,
        createdAt: new Date()
      })
      .then(function (teamTaskHit) {
        callback(null, teamTaskHit)
        EventController.push(new CreateTeamTaskHitEvent(teamTaskHit))
      })
      .catch(function (err) {
        if (TeamTaskHitController.isTeamTaskUniqueConstraintViolation(err)) {
          callback(new TaskAlreadySolvedError(), null)
        } else {
          logger.error(err)
          callback(new InternalError(), null)
        }
      })
  }

  static list (callback) {
    TeamTaskHit
      .query()
      .then(function (teamTaskHits) {
        callback(null, teamTaskHits)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static fetchForTeam (teamId) {
    return new Promise(function (resolve, reject) {
      TeamTaskHit
        .query()
        .where('teamId', teamId)
        .then(function (teamTaskHits) {
          resolve(teamTaskHits)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  }

  static listForTeam (teamId, callback) {
    TeamTaskHit
      .query()
      .where('teamId', teamId)
      .then(function (teamTaskHits) {
        callback(null, teamTaskHits)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static listForTask (taskId, callback) {
    TeamTaskHit
      .query()
      .where('taskId', taskId)
      .then(function (teamTaskHits) {
        callback(null, teamTaskHits)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = TeamTaskHitController
