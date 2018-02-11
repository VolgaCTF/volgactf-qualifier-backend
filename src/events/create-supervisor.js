const SupervisorEvent = require('./supervisor')
const { EVENT_CREATE_SUPERVISOR } = require('../utils/constants')
const supervisorSerializer = require('../serializers/supervisor')

class CreateSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(EVENT_CREATE_SUPERVISOR, supervisorSerializer(supervisor))
  }
}

module.exports = CreateSupervisorEvent
