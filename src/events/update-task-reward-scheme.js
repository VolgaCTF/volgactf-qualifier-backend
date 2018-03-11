const BaseEvent = require('./base')
const { EVENT_UPDATE_TASK_REWARD_SCHEME } = require('../utils/constants')
const taskRewardSchemeSerializer = require('../serializers/task-reward-scheme')

class UpdateTaskRewardSchemeEvent extends BaseEvent {
  constructor (task, taskRewardScheme) {
    const data = taskRewardSchemeSerializer(taskRewardScheme)
    if (task.isInitial()) {
      super(EVENT_UPDATE_TASK_REWARD_SCHEME, data, null, null, {})
    } else {
      super(EVENT_UPDATE_TASK_REWARD_SCHEME, data, data, data, {})
    }
  }
}

module.exports = UpdateTaskRewardSchemeEvent
