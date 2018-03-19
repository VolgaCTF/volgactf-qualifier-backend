const Model = require('../utils/model')

class SupervisorInvitation extends Model {
  static get tableName () {
    return 'supervisor_invitations'
  }
}

module.exports = SupervisorInvitation
