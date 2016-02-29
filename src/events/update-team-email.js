import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class UpdateTeamEmailEvent extends SupervisorEvent {
  constructor (team) {
    super(constants.EVENT_UPDATE_TEAM_EMAIL, teamSerializer(team, { exposeEmail: true }))
  }
}
