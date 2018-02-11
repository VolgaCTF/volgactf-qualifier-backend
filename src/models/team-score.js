const Model = require('../utils/model')

class TeamScore extends Model {
  static get tableName () {
    return 'team_scores'
  }
}

module.exports = TeamScore
