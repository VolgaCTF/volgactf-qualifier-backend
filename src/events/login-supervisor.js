const SupervisorEvent = require('./supervisor')
const { EVENT_LOGIN_SUPERVISOR } = require('../utils/constants')
const supervisorSerializer = require('../serializers/supervisor')

class LoginSupervisorEvent extends SupervisorEvent {
  constructor (supervisor, countryName, cityName) {
    super(EVENT_LOGIN_SUPERVISOR, {
      supervisor: supervisorSerializer(supervisor),
      geoIP: {
        countryName: countryName,
        cityName: cityName
      }
    })
  }
}

module.exports = LoginSupervisorEvent
