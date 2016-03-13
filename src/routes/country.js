import express from 'express'
import _ from 'underscore'
let router = express.Router()

import CountryController from '../controllers/country'
import countrySerializer from '../serializers/country'

router.get('/index', (request, response, next) => {
  CountryController.index((err, countries) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(countries, countrySerializer))
    }
  })
})

export default router
