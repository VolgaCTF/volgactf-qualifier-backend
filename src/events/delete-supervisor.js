const SupervisorEvent = require('./supervisor')
const { EVENT_DELETE_SUPERVISOR } = require('../utils/constants')
const supervisorSerializer = require('../serializers/supervisor')

class DeleteSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(EVENT_DELETE_SUPERVISOR, supervisorSerializer(supervisor))
  }
}

module.exports = DeleteSupervisorEvent
