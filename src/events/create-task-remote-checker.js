const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TASK_REMOTE_CHECKER } = require('../utils/constants')
const taskRemoteCheckerSerializer = require('../serializers/task-remote-checker')

class CreateTaskRemoteCheckerEvent extends SupervisorEvent {
  constructor (taskRemoteChecker) {
    super(EVENT_CREATE_TASK_REMOTE_CHECKER, taskRemoteCheckerSerializer(taskRemoteChecker))
  }
}

module.exports = CreateTaskRemoteCheckerEvent
