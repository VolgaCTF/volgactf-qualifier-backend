const Model = require('../utils/model')

class TeamRanking extends Model {
  static get tableName () {
    return 'team_rankings'
  }
}

module.exports = TeamRanking
