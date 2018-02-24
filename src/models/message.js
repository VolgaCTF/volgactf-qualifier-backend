const Model = require('../utils/model')

class Message extends Model {
  static get tableName () {
    return 'messages'
  }
}

module.exports = Message
