const BaseEvent = require('./base')

class BroadcastEvent extends BaseEvent {
  constructor (type, data) {
    super(type, data, data, data, {})
  }
}

module.exports = BroadcastEvent
