const BaseEvent = require('./base')
const { EVENT_REVEAL_TASK_CATEGORY } = require('../utils/constants')
const taskCategorySerializer = require('../serializers/task-category')

class RevealTaskCategoryEvent extends BaseEvent {
  constructor (taskCategory) {
    const data = taskCategorySerializer(taskCategory)
    super(EVENT_REVEAL_TASK_CATEGORY, null, data, data, {})
  }
}

module.exports = RevealTaskCategoryEvent
