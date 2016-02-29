import BroadcastEvent from './broadcast'
import constants from '../utils/constants'
import taskSerializer from '../serializers/task'

export default class OpenTaskEvent extends BroadcastEvent {
  constructor (task) {
    super(constants.EVENT_OPEN_TASK, taskSerializer(task, { preview: true }))
  }
}
