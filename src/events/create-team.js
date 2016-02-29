import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import teamSerializer from '../serializers/team'

export default class CreateTeamEvent extends SupervisorEvent {
  constructor (team) {
    super(constants.EVENT_CREATE_TEAM, teamSerializer(team, { exposeEmail: true }))
  }
}
