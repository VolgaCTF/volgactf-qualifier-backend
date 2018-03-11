const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TASK_VALUE } = require('../utils/constants')
const taskValueSerializer = require('../serializers/task-value')

class CreateTaskValueEvent extends SupervisorEvent {
  constructor (taskValue) {
    super(EVENT_CREATE_TASK_VALUE, taskValueSerializer(taskValue))
  }
}

module.exports = CreateTaskValueEvent
