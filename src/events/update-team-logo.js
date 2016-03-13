import BaseEvent from './base'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class UpdateTeamLogoEvent extends BaseEvent {
  constructor (team) {
    let data = teamSerializer(team, { exposeEmail: true })
    let publicData = null
    let teamData = {}
    if (team.emailConfirmed) {
      publicData = teamSerializer(team)
    } else {
      teamData[team.id] = data
    }

    super(constants.EVENT_UPDATE_TEAM_LOGO, data, publicData, publicData, teamData)
  }
}
