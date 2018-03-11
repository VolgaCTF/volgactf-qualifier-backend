const BaseEvent = require('./base')
const { EVENT_REVEAL_TASK_REWARD_SCHEME } = require('../utils/constants')
const taskRewardSchemeSerializer = require('../serializers/task-reward-scheme')

class RevealTaskRewardSchemeEvent extends BaseEvent {
  constructor (taskRewardScheme) {
    const data = taskRewardSchemeSerializer(taskRewardScheme)
    super(EVENT_REVEAL_TASK_REWARD_SCHEME, null, data, data, {})
  }
}

module.exports = RevealTaskRewardSchemeEvent
