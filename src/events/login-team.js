import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class LoginTeamEvent extends SupervisorEvent {
  constructor (team) {
    super(constants.EVENT_LOGIN_TEAM, teamSerializer(team, { exposeEmail: true }))
  }
}
