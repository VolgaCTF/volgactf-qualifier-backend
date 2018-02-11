const Model = require('../utils/model')

class TeamEmailVerificationToken extends Model {
  static get tableName () {
    return 'team_email_verification_tokens'
  }
}

module.exports = TeamEmailVerificationToken
