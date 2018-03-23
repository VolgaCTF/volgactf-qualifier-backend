function getGeoIPData (request, response, next) {
  const countryCode = request.headers['x-geoip-country-code']
  const countryName = request.headers['x-geoip-country-name']
  const cityName = request.headers['x-geoip-city-name']

  request.geoIPData = {
    countryCode: (countryCode !== '-') ? countryCode : '',
    countryName: (countryName !== '-') ? countryName : '',
    cityName: (cityName !== '-') ? cityName : ''
  }

  next()
}

module.exports.getGeoIPData = getGeoIPData
