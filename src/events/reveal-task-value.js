const BaseEvent = require('./base')
const { EVENT_REVEAL_TASK_VALUE } = require('../utils/constants')
const taskValueSerializer = require('../serializers/task-value')

class RevealTaskValueEvent extends BaseEvent {
  constructor (taskValue) {
    const data = taskValueSerializer(taskValue)
    super(EVENT_REVEAL_TASK_VALUE, null, data, data, {})
  }
}

module.exports = RevealTaskValueEvent
