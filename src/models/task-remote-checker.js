const Model = require('../utils/model')

class TaskRemoteChecker extends Model {
  static get tableName () {
    return 'task_remote_checkers'
  }
}

module.exports = TaskRemoteChecker
