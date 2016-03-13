import BaseEvent from './base'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class UpdateTeamPasswordEvent extends BaseEvent {
  constructor (team) {
    let data = teamSerializer(team, { exposeEmail: true })
    let teamData = {}
    teamData[team.id] = data

    super(constants.EVENT_UPDATE_TEAM_PASSWORD, data, null, null, teamData)
  }
}
