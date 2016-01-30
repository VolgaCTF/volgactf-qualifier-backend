import errors from '../utils/errors'
import is_ from 'is_js'


export default {
  id: function(request, response, next, taskId) {
    let id = parseInt(taskId, 10)
    if (!is_.number(id)) {
      throw new errors.ValidationError()
    }

    request.taskId = id
    next()
  }
}
