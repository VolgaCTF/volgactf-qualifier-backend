import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import teamTaskHitAttemptSerializer from '../serializers/team-task-hit-attempt'

export default class CreateTeamTaskHitAttemptEvent extends SupervisorEvent {
  constructor (teamTaskHitAttempt) {
    super(constants.EVENT_CREATE_TEAM_TASK_HIT_ATTEMPT, teamTaskHitAttemptSerializer(teamTaskHitAttempt), null, null, {})
  }
}
