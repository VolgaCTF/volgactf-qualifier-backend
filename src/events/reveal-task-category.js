import BaseEvent from './base'
import constants from '../utils/constants'
import taskCategorySerializer from '../serializers/task-category'

export default class RevealTaskCategoryEvent extends BaseEvent {
  constructor (taskCategory) {
    let data = taskCategorySerializer(taskCategory)
    super(constants.EVENT_REVEAL_TASK_CATEGORY, null, data, data, {})
  }
}
