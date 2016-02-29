import BaseEvent from './base'
import constants from '../utils/constants'
import taskCategorySerializer from '../serializers/task-category'

export default class CreateTaskCategoryEvent extends BaseEvent {
  constructor (task, taskCategory) {
    let data = taskCategorySerializer(taskCategory)
    if (task.isInitial()) {
      super(constants.EVENT_CREATE_TASK_CATEGORY, data, null, null, {})
    } else {
      super(constants.EVENT_CREATE_TASK_CATEGORY, data, data, data, {})
    }
  }
}
