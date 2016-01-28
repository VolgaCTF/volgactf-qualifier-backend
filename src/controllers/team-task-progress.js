import TeamController from '../controllers/team'
import TeamTaskProgress from '../models/team-task-progress'
import logger from '../utils/logger'
import errors from '../utils/errors'
import BaseEvent from '../utils/events'
import publisher from '../utils/publisher'
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
        TeamTaskProgress.find({ teamId: team._id, taskId: task._id }).count((err, count) => {
          if (err) {
            logger.error(err)
            callback(new errors.InternalError(), null)
          } else {
            if (count > 0) {
              callback(new errors.TaskAlreadySolvedError(), null)
            } else {
              let teamTaskProgress = new TeamTaskProgress({
                teamId: team._id,
                taskId: task._id,
                createdAt: new Date()
              })

              teamTaskProgress.save((err, teamTaskProgress) => {
                if (err) {
                  logger.error(err)
                  callback(new errors.InternalError(), null)
                } else {
                  callback(null, teamTaskProgress)
                  publisher.publish('realtime', new CreateTeamTaskProgressEvent(teamTaskProgress))
                }
              })
            }
          }
        })
      }
    })
  }

  static list(callback) {
    TeamTaskProgress.find({}, (err, teamTaskProgress) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError(), null)
      } else {
        callback(null, teamTaskProgress)
      }
    })
  }

  static listForTeam(teamId, callback) {
    TeamTaskProgress.find({ teamId: teamId }, (err, teamTaskProgress) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError(), null)
      } else {
        callback(null, teamTaskProgress)
      }
    })
  }

  static listForTask(taskId, callback) {
    TeamTaskProgress.find({ taskId: taskId }, (err, teamTaskProgress) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError(), null)
      } else {
        callback(null, teamTaskProgress)
      }
    })
  }
}


export default TeamTaskProgressController
