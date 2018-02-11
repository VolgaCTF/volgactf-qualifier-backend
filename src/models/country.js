const Model = require('../utils/model')

class Country extends Model {
  static get tableName () {
    return 'countries'
  }
}

module.exports = Country
