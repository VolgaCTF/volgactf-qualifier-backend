import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import supervisorSerializer from '../serializers/supervisor'

export default class UpdateSupervisorPasswordEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(constants.EVENT_UPDATE_SUPERVISOR_PASSWORD, supervisorSerializer(supervisor))
  }
}
