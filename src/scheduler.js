import queue from './utils/queue'
import logger from './utils/logger'

class Scheduler {
  constructor () {
    this.updateScoresIntervalId = null
    this.updateScoresInterval = 60
    if (process.env.THEMIS_QUALS_SCHEDULER_UPDATE_SCORES_INTERVAL) {
      this.updateScoresInterval = parseInt(process.env.THEMIS_QUALS_SCHEDULER_UPDATE_SCORES_INTERVAL, 10)
    }

    this.checkContestIntervalId = null
    this.checkContestInterval = 10
    if (process.env.THEMIS_QUALS_SCHEDULER_CHECK_CONTEST_INTERVAL) {
      this.checkContestInterval = parseInt(process.env.THEMIS_QUALS_SCHEDULER_CHECK_CONTEST_INTERVAL, 10)
    }
  }

  run () {
    logger.info('Setting updateScoresInterval')
    this.updateScoresIntervalId = setInterval(function () {
      logger.info('Triggered updateScoresInterval')
      queue('updateScoresQueue').add()
    }, this.updateScoresInterval * 1000)

    logger.info('Setting checkContestInterval')
    this.checkContestIntervalId = setInterval(function () {
      logger.info('Triggered checkContestInterval')
      queue('checkContestQueue').add()
    }, this.checkContestInterval * 1000)
  }

  shutdown () {
    if (this.updateScoresIntervalId) {
      logger.info('Cancelling updateScoresInterval')
      clearInterval(this.updateScoresIntervalId)
    }

    if (this.checkContestInterval) {
      logger.info('Cancelling checkContestInterval')
      clearInterval(this.checkContestIntervalId)
    }
  }
}

export default new Scheduler()
