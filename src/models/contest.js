const { CONTEST_INITIAL, CONTEST_STARTED, CONTEST_PAUSED, CONTEST_FINISHED } = require('../utils/constants')
const Model = require('../utils/model')

class Contest extends Model {
  static get tableName () {
    return 'contests'
  }

  isInitial () {
    return this.state === CONTEST_INITIAL
  }

  isStarted () {
    return this.state === CONTEST_STARTED
  }

  isPaused () {
    return this.state === CONTEST_PAUSED
  }

  isFinished () {
    return this.state === CONTEST_FINISHED
  }
}

module.exports = Contest
