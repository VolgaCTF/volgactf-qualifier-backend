const BaseEvent = require('./base')
const { EVENT_UPDATE_TASK } = require('../utils/constants')
const taskSerializer = require('../serializers/task')

class UpdateTaskEvent extends BaseEvent {
  constructor (task) {
    const data = taskSerializer(task, { preview: true })
    if (task.isInitial()) {
      super(EVENT_UPDATE_TASK, data, null, null, {})
    } else {
      super(EVENT_UPDATE_TASK, data, data, data, {})
    }
  }
}

module.exports = UpdateTaskEvent
