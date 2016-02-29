import { ValidationError } from '../utils/errors'
import is_ from 'is_js'

export default {
  id: function (request, response, next, categoryId) {
    let id = parseInt(categoryId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.categoryId = id
    next()
  }
}
