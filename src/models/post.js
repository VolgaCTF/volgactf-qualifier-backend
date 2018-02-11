const Model = require('../utils/model')

class Post extends Model {
  static get tableName () {
    return 'posts'
  }
}

module.exports = Post
