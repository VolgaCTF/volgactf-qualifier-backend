function getGeoIPData (request, response, next) {
  const countryCode = request.headers['x-geoip-country-code']
  const cityName = request.headers['x-geoip-city-name']

  request.geoIPData = {
    countryCode: (countryCode !== '-') ? countryCode : '',
    cityName: (cityName !== '-') ? cityName : ''
  }

  next()
}

module.exports.getGeoIPData = getGeoIPData
