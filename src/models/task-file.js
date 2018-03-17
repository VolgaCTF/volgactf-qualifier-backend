const Model = require('../utils/model')

class TaskFile extends Model {
  static get tableName () {
    return 'task_files'
  }
}

module.exports = TaskFile
