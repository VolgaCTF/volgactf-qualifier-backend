const Model = require('../utils/model')

class RemoteChecker extends Model {
  static get tableName () {
    return 'remote_checkers'
  }
}

module.exports = RemoteChecker
