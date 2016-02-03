import { ValidationError } from '../utils/errors'
import is_ from 'is_js'


export default {
  id: function (request, response, next, postId) {
    let id = parseInt(postId, 10)
    if (!is_.number(id)) {
      throw new ValidationError()
    }

    request.postId = id
    next()
  }
}
