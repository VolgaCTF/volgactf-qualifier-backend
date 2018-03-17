const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TASK_FILE } = require('../utils/constants')
const taskFileSerializer = require('../serializers/task-file')

class CreateTaskFileEvent extends SupervisorEvent {
  constructor (taskFile) {
    super(EVENT_CREATE_TASK_FILE, taskFileSerializer(taskFile))
  }
}

module.exports = CreateTaskFileEvent
