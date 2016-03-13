import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import supervisorSerializer from '../serializers/supervisor'

export default class DeleteSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(constants.EVENT_DELETE_SUPERVISOR, supervisorSerializer(supervisor))
  }
}
