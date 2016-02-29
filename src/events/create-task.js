import SupervisorEvent from './supervisor'
import constants from '../utils/constants'
import taskSerializer from '../serializers/task'

export default class CreateTaskEvent extends SupervisorEvent {
  constructor (task) {
    super(constants.EVENT_CREATE_TASK, taskSerializer(task, { preview: true }))
  }
}
