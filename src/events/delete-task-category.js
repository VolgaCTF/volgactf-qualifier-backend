const BaseEvent = require('./base')
const { EVENT_DELETE_TASK_CATEGORY } = require('../utils/constants')
const taskCategorySerializer = require('../serializers/task-category')

class DeleteTaskCategoryEvent extends BaseEvent {
  constructor (task, taskCategory) {
    const data = taskCategorySerializer(taskCategory)
    if (task.isInitial()) {
      super(EVENT_DELETE_TASK_CATEGORY, data, null, null, {})
    } else {
      super(EVENT_DELETE_TASK_CATEGORY, data, data, data, {})
    }
  }
}

module.exports = DeleteTaskCategoryEvent
