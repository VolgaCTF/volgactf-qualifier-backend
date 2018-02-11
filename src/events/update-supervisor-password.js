const SupervisorEvent = require('./supervisor')
const { EVENT_UPDATE_SUPERVISOR_PASSWORD } = require('../utils/constants')
const supervisorSerializer = require('../serializers/supervisor')

class UpdateSupervisorPasswordEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(EVENT_UPDATE_SUPERVISOR_PASSWORD, supervisorSerializer(supervisor))
  }
}

module.exports = UpdateSupervisorPasswordEvent
