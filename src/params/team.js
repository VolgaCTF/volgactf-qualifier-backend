const { ValidationError } = require('../utils/errors')
const is_ = require('is_js')

module.exports = {
  id: function (request, response, next, teamId) {
    const id = parseInt(teamId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.teamId = id
    next()
  }
}
