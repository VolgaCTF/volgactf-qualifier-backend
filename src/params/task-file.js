const { ValidationError } = require('../utils/errors')
const is_ = require('is_js')

module.exports = {
  id: function (request, response, next, taskFileId) {
    const id = parseInt(taskFileId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.taskFileId = id
    next()
  }
}
