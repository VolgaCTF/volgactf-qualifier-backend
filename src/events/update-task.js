import BaseEvent from './base'
import constants from '../utils/constants'
import taskSerializer from '../serializers/task'

export default class UpdateTaskEvent extends BaseEvent {
  constructor (task) {
    let data = taskSerializer(task, { preview: true })
    if (task.isInitial()) {
      super(constants.EVENT_UPDATE_TASK, data, null, null, {})
    } else {
      super(constants.EVENT_UPDATE_TASK, data, data, data, {})
    }
  }
}
