const SupervisorEvent = require('./supervisor')
const { EVENT_LOGIN_SUPERVISOR } = require('../utils/constants')
const supervisorSerializer = require('../serializers/supervisor')

class LoginSupervisorEvent extends SupervisorEvent {
  constructor (supervisor) {
    super(EVENT_LOGIN_SUPERVISOR, supervisorSerializer(supervisor))
  }
}

module.exports = LoginSupervisorEvent
