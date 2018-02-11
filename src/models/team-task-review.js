const Model = require('../utils/model')

class TeamTaskReview extends Model {
  static get tableName () {
    return 'team_task_reviews'
  }
}

module.exports = TeamTaskReview
