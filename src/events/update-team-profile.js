import BaseEvent from './base'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class UpdateTeamProfileEvent extends BaseEvent {
  constructor (team) {
    let publicData = teamSerializer(team)
    let data = teamSerializer(team, { exposeEmail: true })
    super(constants.EVENT_UPDATE_TEAM_PROFILE, data, publicData, publicData, {})
  }
}
