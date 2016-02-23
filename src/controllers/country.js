import Country from '../models/country'
import { InternalError } from '../utils/errors'
import logger from '../utils/logger'

class CountryController {
  static list (callback) {
    Country
      .query()
      .then((countries) => {
        callback(null, countries)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default CountryController
