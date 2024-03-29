const SupervisorEvent = require('./supervisor')
const { EVENT_LOGIN_TEAM } = require('../utils/constants')
const teamSerializer = require('../serializers/team')

class LoginTeamEvent extends SupervisorEvent {
  constructor (team, countryName, cityName, ctftime) {
    super(EVENT_LOGIN_TEAM, {
      team: teamSerializer(team, { exposeEmail: true }),
      geoIP: {
        countryName,
        cityName
      },
      ctftime
    })
  }
}

module.exports = LoginTeamEvent
