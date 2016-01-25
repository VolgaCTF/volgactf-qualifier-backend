
export default class BaseEvent {
  constructor(name) {
    this.name = name
    this.data = {
      supervisors: null,
      teams: null,
      guests: null,
      team: {}
    }
  }

  serialize() {
    return {
      name: this.name,
      data: {
        supervisors: this.data.supervisors,
        teams: this.data.teams,
        guests: this.data.guests,
        team: this.data.team
      }
    }
  }
}
