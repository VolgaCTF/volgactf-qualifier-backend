const Model = require('../utils/model')

class Team extends Model {
  static get tableName () {
    return 'teams'
  }

  isQualified () {
    return this.emailConfirmed && !this.disqualified
  }
}

module.exports = Team
