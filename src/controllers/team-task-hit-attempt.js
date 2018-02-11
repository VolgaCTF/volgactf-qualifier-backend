const TeamTaskHitAttempt = require('../models/team-task-hit-attempt')
const logger = require('../utils/logger')
const { InternalError } = require('../utils/errors')
const EventController = require('./event')
const CreateTeamTaskHitAttemptEvent = require('../events/create-team-task-hit-attempt')

class TeamTaskHitAttemptController {
  static create (teamId, taskId, wrongAnswer, callback) {
    TeamTaskHitAttempt
      .query()
      .insert({
        teamId: teamId,
        taskId: taskId,
        wrongAnswer: wrongAnswer,
        createdAt: new Date()
      })
      .then(function (teamTaskHitAttempt) {
        callback(null, teamTaskHitAttempt)
        EventController.push(new CreateTeamTaskHitAttemptEvent(teamTaskHitAttempt))
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static index (callback) {
    TeamTaskHitAttempt
      .query()
      .then(function (teamTaskHitAttempts) {
        callback(null, teamTaskHitAttempts)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = TeamTaskHitAttemptController
