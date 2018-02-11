const BaseEvent = require('./base')
const { EVENT_CREATE_TEAM_TASK_HIT } = require('../utils/constants')
const teamTaskHitSerializer = require('../serializers/team-task-hit')

class CreateTeamTaskHitEvent extends BaseEvent {
  constructor (teamTaskHit) {
    const data = teamTaskHitSerializer(teamTaskHit)
    const teamData = {}
    teamData[teamTaskHit.teamId] = data
    super(EVENT_CREATE_TEAM_TASK_HIT, data, null, null, teamData)
  }
}

module.exports = CreateTeamTaskHitEvent
