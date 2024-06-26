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

  static fetch (callback) {
    return new Promise(function (resolve, reject) {
      Country
        .query()
        .then(function (countries) {
          resolve(countries)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  static findByCodeOrDefault (code) {
    return new Promise(function (resolve, reject) {
      Country
        .query()
        .where('code', code)
        .orWhere('code', '')
        .orderBy('id', 'desc')
        .first()
        .then(function (country) {
          if (country) {
            resolve(country)
          } else {
            reject(new InternalError())
          }
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }
}

module.exports = CountryController
