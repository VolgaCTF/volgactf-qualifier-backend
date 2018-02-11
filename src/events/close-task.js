const BroadcastEvent = require('./broadcast')
const { EVENT_CLOSE_TASK } = require('../utils/constants')
const taskSerializer = require('../serializers/task')

class CloseTaskEvent extends BroadcastEvent {
  constructor (task) {
    super(EVENT_CLOSE_TASK, taskSerializer(task, { preview: true }))
  }
}

module.exports = CloseTaskEvent
