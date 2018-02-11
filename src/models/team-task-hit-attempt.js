const Model = require('../utils/model')

class TeamTaskHitAttempt extends Model {
  static get tableName () {
    return 'team_task_hit_attempts'
  }
}

module.exports = TeamTaskHitAttempt
