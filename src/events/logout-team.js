import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class LogoutTeamEvent extends SupervisorEvent {
  constructor (team) {
    super(constants.EVENT_LOGOUT_TEAM, teamSerializer(team, { exposeEmail: true }))
  }
}
