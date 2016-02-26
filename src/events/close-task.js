import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import taskSerializer from '../serializers/task'

export default class CloseTaskEvent extends BroadcastEvent {
  constructor (task) {
    super(constants.EVENT_CLOSE_TASK, taskSerializer(task, { preview: true }))
  }
}
