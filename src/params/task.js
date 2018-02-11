const { ValidationError } = require('../utils/errors')
const is_ = require('is_js')

module.exports = {
  id: function (request, response, next, taskId) {
    const id = parseInt(taskId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.taskId = id
    next()
  }
}
