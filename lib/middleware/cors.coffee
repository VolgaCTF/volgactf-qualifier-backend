module.exports = (request, response, next) ->
    response.header 'Access-Control-Allow-Origin', 'http://' + process.env.DOMAIN
    response.header 'Access-Control-Allow-Credentials', 'true'
    response.header 'Access-Control-Allow-Headers', 'X-CSRF-Token'
    next()
