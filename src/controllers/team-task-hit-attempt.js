import TeamTaskHitAttempt from '../models/team-task-hit-attempt'
import logger from '../utils/logger'
import { InternalError } from '../utils/errors'
import EventController from './event'
import CreateTeamTaskHitAttemptEvent from '../events/create-team-task-hit-attempt'

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
      .then((teamTaskHitAttempt) => {
        callback(null, teamTaskHitAttempt)
        EventController.push(new CreateTeamTaskHitAttemptEvent(teamTaskHitAttempt))
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TeamTaskHitAttemptController
