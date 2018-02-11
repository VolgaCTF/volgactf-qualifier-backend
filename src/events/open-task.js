const BroadcastEvent = require('./broadcast')
const { EVENT_OPEN_TASK } = require('../utils/constants')
const taskSerializer = require('../serializers/task')

class OpenTaskEvent extends BroadcastEvent {
  constructor (task) {
    super(EVENT_OPEN_TASK, taskSerializer(task, { preview: true }))
  }
}

module.exports = OpenTaskEvent
