const Country = require('../models/country')
const { InternalError } = require('../utils/errors')
const logger = require('../utils/logger')

class CountryController {
  static index (callback) {
    Country
      .query()
      .then(function (countries) {
        callback(null, countries)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = CountryController
