class BaseEvent {
  constructor (type, supervisorsData, teamsData, guestsData, teamData) {
    this.type = type
    this.data = {
      supervisors: supervisorsData,
      teams: teamsData,
      guests: guestsData,
      team: teamData
    }
  }
}

module.exports = BaseEvent
