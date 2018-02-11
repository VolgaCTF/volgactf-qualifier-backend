const Model = require('../utils/model')

class Supervisor extends Model {
  static get tableName () {
    return 'supervisors'
  }
}

module.exports = Supervisor
