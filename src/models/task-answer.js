const Model = require('../utils/model')

class TaskAnswer extends Model {
  static get tableName () {
    return 'task_answers'
  }
}

module.exports = TaskAnswer
