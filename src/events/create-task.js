const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TASK } = require('../utils/constants')
const taskSerializer = require('../serializers/task')

class CreateTaskEvent extends SupervisorEvent {
  constructor (task) {
    super(EVENT_CREATE_TASK, taskSerializer(task, { preview: true }))
  }
}

module.exports = CreateTaskEvent
