const SupervisorEvent = require('./supervisor')
const { EVENT_LOGOUT_SUPERVISOR } = require('../utils/constants')
const supervisorSerializer = require('../serializers/supervisor')

class LogoutSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(EVENT_LOGOUT_SUPERVISOR, supervisorSerializer(supervisor))
  }
}

module.exports = LogoutSupervisorEvent
