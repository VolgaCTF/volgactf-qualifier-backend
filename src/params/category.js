const { ValidationError } = require('../utils/errors')
const is_ = require('is_js')

module.exports = {
  id: function (request, response, next, categoryId) {
    const id = parseInt(categoryId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.categoryId = id
    next()
  }
}
