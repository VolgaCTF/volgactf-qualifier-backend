import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import supervisorSerializer from '../serializers/supervisor'

export default class LogoutSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(constants.EVENT_LOGOUT_SUPERVISOR, supervisorSerializer(supervisor))
  }
}
