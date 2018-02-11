const Model = require('../utils/model')

class Category extends Model {
  static get tableName () {
    return 'categories'
  }
}

module.exports = Category
