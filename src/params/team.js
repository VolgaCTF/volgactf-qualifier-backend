import errors from '../utils/errors'
import is_ from 'is_js'


export default {
  id: function(request, response, next, teamId) {
    let id = parseInt(teamId, 10)
    if (!is_.number(id)) {
      throw new errors.ValidationError()
    }

    request.teamId = id
    next()
  }
}
