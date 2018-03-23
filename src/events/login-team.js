const SupervisorEvent = require('./supervisor')
const { EVENT_LOGIN_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class LoginTeamEvent extends SupervisorEvent {
  constructor (team, countryName, cityName) {
    super(EVENT_LOGIN_TEAM, {
      team: teamSerializer(team, { exposeEmail: true }),
      geoIP: {
        countryName: countryName,
        cityName: cityName
      }
    })
  }
}

module.exports = LoginTeamEvent
