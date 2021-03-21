const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_TASK_REWARD_SCHEME } = require('../utils/constants')
const taskRewardSchemeSerializer = require('../serializers/task-reward-scheme')

class CreateTaskRewardSchemeEvent extends SupervisorEvent {
  constructor (taskRewardScheme) {
    super(EVENT_CREATE_TASK_REWARD_SCHEME, taskRewardSchemeSerializer(taskRewardScheme, { exposeDynlog: true }))
  }
}

module.exports = CreateTaskRewardSchemeEvent
