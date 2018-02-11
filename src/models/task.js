const { TASK_INITIAL, TASK_OPENED, TASK_CLOSED } = require('../utils/constants')
const Model = require('../utils/model')

class Task extends Model {
  static get tableName () {
    return 'tasks'
  }

  isInitial () {
    return this.state === TASK_INITIAL
  }

  isOpened () {
    return this.state === TASK_OPENED
  }

  isClosed () {
    return this.state === TASK_CLOSED
  }
}

module.exports = Task
