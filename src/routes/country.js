const express = require('express')
const _ = require('underscore')
const router = express.Router()

const CountryController = require('../controllers/country')
const countrySerializer = require('../serializers/country')

router.get('/index', function (request, response, next) {
  CountryController.index(function (err, countries) {
    if (err) {
      next(err)
    } else {
      response.json(_.map(countries, countrySerializer))
    }
  })
})

module.exports = router
