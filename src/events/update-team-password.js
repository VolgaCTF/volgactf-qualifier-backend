import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class UpdateTeamPasswordEvent extends SupervisorEvent {
  constructor (team) {
    super(constants.EVENT_UPDATE_TEAM_PASSWORD, teamSerializer(team, { exposeEmail: true }))
  }
}
