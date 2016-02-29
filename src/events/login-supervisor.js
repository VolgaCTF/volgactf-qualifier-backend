import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import supervisorSerializer from '../serializers/supervisor'

export default class LoginSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(constants.EVENT_LOGIN_SUPERVISOR, supervisorSerializer(supervisor))
  }
}
