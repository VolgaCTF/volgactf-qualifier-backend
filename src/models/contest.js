import constants from '../utils/constants'
import Model from '../utils/model'

export default class Contest extends Model {
  static tableName = 'contests'

  isInitial () {
    return this.state === constants.CONTEST_INITIAL
  }

  isStarted () {
    return this.state === constants.CONTEST_STARTED
  }

  isPaused () {
    return this.state === constants.CONTEST_PAUSED
  }

  isFinished () {
    return this.state === constants.CONTEST_FINISHED
  }
}
