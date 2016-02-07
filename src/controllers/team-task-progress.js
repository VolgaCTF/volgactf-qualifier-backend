import TeamController from '../controllers/team'
import TeamTaskProgress from '../models/team-task-progress'
import logger from '../utils/logger'
import { InternalError, TaskAlreadySolvedError } from '../utils/errors'
import BaseEvent from '../utils/events'
import publish from '../utils/publisher'
import teamTaskProgressSerializer from '../serializers/team-task-progress'
import constants from '../utils/constants'


class CreateTeamTaskProgressEvent extends BaseEvent {
  constructor(teamTaskProgress) {
    super('createTeamTaskProgress')
    let teamTaskProgressData = teamTaskProgressSerializer(teamTaskProgress)
    this.data.supervisors = teamTaskProgressData
    this.data.team[teamTaskProgress.teamId] = teamTaskProgressData
  }
}


class TeamTaskProgressController {
  static isTeamTaskUniqueConstraintViolation(err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'team_task_progresses_ndx_team_task_unique')
  }

  static create(teamId, task, callback) {
    TeamTaskProgress
      .query()
      .insert({
        teamId: teamId,
        taskId: task.id,
        createdAt: new Date()
      })
      .then((teamTaskProgress) => {
        callback(null, teamTaskProgress)
        publish('realtime', new CreateTeamTaskProgressEvent(teamTaskProgress))
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

  static list(callback) {
    TeamTaskProgress
      .query()
      .then((teamTaskProgress) => {
        callback(null, teamTaskProgress)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static listForTeam(teamId, callback) {
    TeamTaskProgress
      .query()
      .where('teamId', teamId)
      .then((teamTaskProgress) => {
        callback(null, teamTaskProgress)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static listForTask(taskId, callback) {
    TeamTaskProgress
      .query()
      .where('taskId', taskId)
      .then((teamTaskProgress) => {
        callback(null, teamTaskProgress)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}


export default TeamTaskProgressController
