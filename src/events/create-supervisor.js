import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import supervisorSerializer from '../serializers/supervisor'

export default class CreateSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(constants.EVENT_CREATE_SUPERVISOR, supervisorSerializer(supervisor))
  }
}
