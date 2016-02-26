import BaseEvent from './base'
import constants from '../utils/constants'

export default class RemoveTaskCategoryEvent extends BaseEvent {
  constructor (task, taskCategoryId) {
    let data = { id: taskCategoryId }
    if (task.isInitial()) {
      super(constants.EVENT_REMOVE_TASK_CATEGORY, data, null, null, {})
    } else {
      super(constants.EVENT_REMOVE_TASK_CATEGORY, data, data, data, {})
    }
  }
}
