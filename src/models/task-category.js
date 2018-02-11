const Model = require('../utils/model')

class TaskCategory extends Model {
  static get tableName () {
    return 'task_categories'
  }
}

module.exports = TaskCategory
