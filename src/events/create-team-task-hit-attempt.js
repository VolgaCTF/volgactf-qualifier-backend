const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TEAM_TASK_HIT_ATTEMPT } = require('../utils/constants')
const teamTaskHitAttemptSerializer = require('../serializers/team-task-hit-attempt')

class CreateTeamTaskHitAttemptEvent extends SupervisorEvent {
  constructor (teamTaskHitAttempt) {
    super(EVENT_CREATE_TEAM_TASK_HIT_ATTEMPT, teamTaskHitAttemptSerializer(teamTaskHitAttempt), null, null, {})
  }
}

module.exports = CreateTeamTaskHitAttemptEvent
