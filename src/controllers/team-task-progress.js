import TeamController from '../controllers/team'
import TeamTaskProgress from '../models/team-task-progress'
import logger from '../utils/logger'
import { InternalError, TaskAlreadySolvedError } from '../utils/errors'
import BaseEvent from '../utils/events'
import publish from '../utils/publisher'
import teamTaskProgressSerializer from '../serializers/team-task-progress'


class CreateTeamTaskProgressEvent extends BaseEvent {
  constructor(teamTaskProgress) {
    super('createTeamTaskProgress')
    let teamTaskProgressData = teamTaskProgressSerializer(teamTaskProgress)
    this.data.supervisors = teamTaskProgressData
    this.data.team[teamTaskProgress.teamId] = teamTaskProgressData
  }
}


class TeamTaskProgressController {
  static create(teamId, task, callback) {
    TeamController.get(teamId, (err, team) => {
      if (err) {
        callback(err, null)
      } else {
        TeamTaskProgress
          .query()
          .where('teamId', team.id)
          .andWhere('taskId', task.id)
          .first()
          .then((teamTaskProgress) => {
            if (teamTaskProgress) {
              callback(new TaskAlreadySolvedError(), null)
            } else {
              TeamTaskProgress
                .query()
                .insert({
                  teamId: team.id,
                  taskId: task.id,
                  createdAt: new Date()
                })
                .then((teamTaskProgress) => {
                  callback(null, teamTaskProgress)
                  publish('realtime', new CreateTeamTaskProgressEvent(teamTaskProgress))
                })
                .catch((err) => {
                  logger.error(err)
                  callback(new InternalError(), null)
                })
            }
          })
          .catch((err) => {
            logger.error(err)
            callback(new InternalError(), null)
          })
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
