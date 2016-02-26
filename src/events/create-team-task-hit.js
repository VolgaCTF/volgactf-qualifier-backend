import BaseEvent from './base'
import constants from '../utils/constants'
import teamTaskHitSerializer from '../serializers/team-task-hit'

export default class CreateTeamTaskHitEvent extends BaseEvent {
  constructor (teamTaskHit) {
    let data = teamTaskHitSerializer(teamTaskHit)
    let teamData = {}
    teamData[teamTaskHit.teamId] = data
    super(constants.EVENT_CREATE_TEAM_TASK_HIT, data, null, null, teamData)
  }
}
