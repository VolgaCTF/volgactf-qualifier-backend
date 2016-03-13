import BaseEvent from './base'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class DisqualifyTeamEvent extends BaseEvent {
  constructor (team) {
    let publicData = teamSerializer(team)
    let data = teamSerializer(team, { exposeEmail: true })
    super(constants.EVENT_DISQUALIFY_TEAM, data, publicData, publicData, {})
  }
}
