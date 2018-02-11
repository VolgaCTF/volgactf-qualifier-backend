const Model = require('../utils/model')

class TeamTaskHit extends Model {
  static get tableName () {
    return 'team_task_hits'
  }
}

module.exports = TeamTaskHit
