const BaseEvent = require('./base')
const { EVENT_UPDATE_TASK_VALUE } = require('../utils/constants')
const taskValueSerializer = require('../serializers/task-value')

class UpdateTaskValueEvent extends BaseEvent {
  constructor (task, taskValue) {
    const data = taskValueSerializer(taskValue)
    if (task.isInitial()) {
      super(EVENT_UPDATE_TASK_VALUE, data, null, null, {})
    } else {
      super(EVENT_UPDATE_TASK_VALUE, data, data, data, {})
    }
  }
}

module.exports = UpdateTaskValueEvent
