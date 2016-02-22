import TeamTaskHit from '../models/team-task-hit'
import logger from '../utils/logger'
import { InternalError, TaskAlreadySolvedError } from '../utils/errors'
import BaseEvent from '../utils/events'
import publish from '../utils/publisher'
import teamTaskHitSerializer from '../serializers/team-task-hit'
import constants from '../utils/constants'

class CreateTeamTaskHitEvent extends BaseEvent {
  constructor (teamTaskHit) {
    super('createTeamTaskHit')
    let teamTaskHitData = teamTaskHitSerializer(teamTaskHit)
    this.data.supervisors = teamTaskHitData
    this.data.team[teamTaskHit.teamId] = teamTaskHitData
  }
}

class TeamTaskHitController {
  static isTeamTaskUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'team_task_hits_ndx_team_task_unique')
  }

  static create (teamId, task, callback) {
    TeamTaskHit
      .query()
      .insert({
        teamId: teamId,
        taskId: task.id,
        createdAt: new Date()
      })
      .then((teamTaskHit) => {
        callback(null, teamTaskHit)
        publish('realtime', new CreateTeamTaskHitEvent(teamTaskHit))
      })
      .catch((err) => {
        if (this.isTeamTaskUniqueConstraintViolation(err)) {
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
      .then((teamTaskHits) => {
        callback(null, teamTaskHits)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static listForTeam (teamId, callback) {
    TeamTaskHit
      .query()
      .where('teamId', teamId)
      .then((teamTaskHits) => {
        callback(null, teamTaskHits)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static listForTask (taskId, callback) {
    TeamTaskHit
      .query()
      .where('taskId', taskId)
      .then((teamTaskHits) => {
        callback(null, teamTaskHits)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TeamTaskHitController
