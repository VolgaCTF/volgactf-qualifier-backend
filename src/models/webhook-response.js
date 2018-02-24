const Model = require('../utils/model')

class WebhookResponse extends Model {
  static get tableName () {
    return 'webhook_responses'
  }
}

module.exports = WebhookResponse
