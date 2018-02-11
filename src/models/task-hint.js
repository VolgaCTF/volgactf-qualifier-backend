const Model = require('../utils/model')

class TaskHint extends Model {
  static get tableName () {
    return 'task_hints'
  }
}

module.exports = TaskHint
