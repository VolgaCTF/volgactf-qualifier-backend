const BaseEvent = require('./base')

class SupervisorEvent extends BaseEvent {
  constructor (type, data) {
    super(type, data, null, null, {})
  }
}

module.exports = SupervisorEvent
