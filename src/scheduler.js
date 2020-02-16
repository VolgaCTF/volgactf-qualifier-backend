const queue = require('./utils/queue')
const logger = require('./utils/logger')

class Scheduler {
  constructor () {
    this.recalculateIntervalId = null
    this.recalculateInterval = 60
    if (process.env.VOLGACTF_QUALIFIER_SCHEDULER_RECALCULATE_INTERVAL) {
      this.recalculateInterval = parseInt(process.env.VOLGACTF_QUALIFIER_SCHEDULER_RECALCULATE_INTERVAL, 10)
    }

    this.checkContestIntervalId = null
    this.checkContestInterval = 10
    if (process.env.VOLGACTF_QUALIFIER_SCHEDULER_CHECK_CONTEST_INTERVAL) {
      this.checkContestInterval = parseInt(process.env.VOLGACTF_QUALIFIER_SCHEDULER_CHECK_CONTEST_INTERVAL, 10)
    }

    this.checkTasksIntervalId = null
    this.checkTasksInterval = 20
    if (process.env.VOLGACTF_QUALIFIER_SCHEDULER_CHECK_TASKS_INTERVAL) {
      this.checkTasksInterval = parseInt(process.env.VOLGACTF_QUALIFIER_SCHEDULER_CHECK_TASKS_INTERVAL, 10)
    }
  }

  run () {
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

    logger.info('Setting checkTasksInterval')
    this.checkTasksIntervalId = setInterval(function () {
      logger.info('Triggered checkTasksInterval')
      queue('checkTasksQueue').add()
    }, this.checkTasksInterval * 1000)
  }

  shutdown () {
    if (this.checkContestIntervalId) {
      logger.info('Cancelling checkContestInterval')
      clearInterval(this.checkContestIntervalId)
    }

    if (this.recalculateIntervalId) {
      logger.info('Cancelling recalculateInterval')
      clearInterval(this.recalculateIntervalId)
    }

    if (this.checkTasksIntervalId) {
      logger.info('Cancelling checkTasksInterval')
      clearInterval(this.checkTasksIntervalId)
    }
  }
}

module.exports = new Scheduler()
