const { ValidationError } = require('../utils/errors')
const is_ = require('is_js')

module.exports = {
  id: function (request, response, next, postId) {
    const id = parseInt(postId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.postId = id
    next()
  }
}
