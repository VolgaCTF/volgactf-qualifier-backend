import SupervisorEvent from './supervisor'
import constants from '../utils/constants'

export default class RemoveSupervisorEvent extends SupervisorEvent {
  constructor (supervisorUsername) {
    super(constants.EVENT_REMOVE_SUPERVISOR, { username: supervisorUsername })
  }
}
