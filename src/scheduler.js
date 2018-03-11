const queue = require('./utils/queue')
const logger = require('./utils/logger')

class Scheduler {
  constructor () {
    this.recalculateIntervalId = null
    this.recalculateInterval = 60
    if (process.env.THEMIS_QUALS_SCHEDULER_RECALCULATE_INTERVAL) {
      this.recalculateInterval = parseInt(process.env.THEMIS_QUALS_SCHEDULER_RECALCULATE_INTERVAL, 10)
    }

    // this.updateScoresIntervalId = null
    // this.updateScoresInterval = 60
    // if (process.env.THEMIS_QUALS_SCHEDULER_UPDATE_SCORES_INTERVAL) {
    //   this.updateScoresInterval = parseInt(process.env.THEMIS_QUALS_SCHEDULER_UPDATE_SCORES_INTERVAL, 10)
    // }

    this.checkContestIntervalId = null
    this.checkContestInterval = 10
    if (process.env.THEMIS_QUALS_SCHEDULER_CHECK_CONTEST_INTERVAL) {
      this.checkContestInterval = parseInt(process.env.THEMIS_QUALS_SCHEDULER_CHECK_CONTEST_INTERVAL, 10)
    }
  }

  run () {
    // logger.info('Setting updateScoresInterval')
    // this.updateScoresIntervalId = setInterval(function () {
    //   logger.info('Triggered updateScoresInterval')
    //   queue('updateScoresQueue').add()
    // }, this.updateScoresInterval * 1000)

    logger.info('Setting checkContestInterval')
    this.checkContestIntervalId = setInterval(function () {
      logger.info('Triggered checkContestInterval')
      queue('checkContestQueue').add()
    }, this.checkContestInterval * 1000)

    logger.info('Setting recalculateInterval')
    this.recalculateIntervalId = setInterval(function () {
      logger.info('Triggered recalculateInterval')
      queue('recalculateQueue').add()
    }, this.recalculateInterval * 1000)
  }

  shutdown () {
    // if (this.updateScoresIntervalId) {
    //   logger.info('Cancelling updateScoresInterval')
    //   clearInterval(this.updateScoresIntervalId)
    // }

    if (this.checkContestIntervalId) {
      logger.info('Cancelling checkContestInterval')
      clearInterval(this.checkContestIntervalId)
    }

    if (this.recalculateIntervalId) {
      logger.info('Cancelling recalculateInterval')
      clearInterval(this.recalculateIntervalId)
    }
  }
}

module.exports = new Scheduler()
