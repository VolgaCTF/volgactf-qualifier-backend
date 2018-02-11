const Model = require('../utils/model')

class TeamResetPasswordToken extends Model {
  static get tableName () {
    return 'team_reset_password_tokens'
  }
}

module.exports = TeamResetPasswordToken
