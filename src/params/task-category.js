import { ValidationError } from '../utils/errors'
import is_ from 'is_js'


export default {
  id: function(request, response, next, taskCategoryId) {
    let id = parseInt(taskCategoryId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.taskCategoryId = id
    next()
  }
}
