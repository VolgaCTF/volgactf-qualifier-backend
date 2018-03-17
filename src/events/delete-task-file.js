const SupervisorEvent = require('./supervisor')
const { EVENT_DELETE_TASK_FILE } = require('../utils/constants')
const taskFileSerializer = require('../serializers/task-file')

class DeleteTaskFileEvent extends SupervisorEvent {
  constructor (taskFile) {
    super(EVENT_DELETE_TASK_FILE, taskFileSerializer(taskFile))
  }
}

module.exports = DeleteTaskFileEvent
