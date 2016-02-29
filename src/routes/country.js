import express from 'express'
import _ from 'underscore'
let router = express.Router()

import CountryController from '../controllers/country'
import countrySerializer from '../serializers/country'

router.get('/all', (request, response, next) => {
  CountryController.list((err, countries) => {
    if (err) {
      next(err)
    } else {
      response.json(_.map(countries, countrySerializer))
    }
  })
})

export default router
