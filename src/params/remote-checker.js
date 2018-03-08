const { ValidationError } = require('../utils/errors')
const is_ = require('is_js')

module.exports = {
  id: function (request, response, next, remoteCheckerId) {
    const id = parseInt(remoteCheckerId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.remoteCheckerId = id
    next()
  }
}
