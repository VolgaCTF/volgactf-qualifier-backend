const Model = require('../utils/model')

class TaskValue extends Model {
  static get tableName () {
    return 'task_values'
  }
}

module.exports = TaskValue
