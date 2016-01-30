import { InvalidCSRFTokenError } from '../utils/errors'


export function checkToken(request, response, next) {
  if (request.get('X-CSRF-Token') !== request.session.token) {
    throw new InvalidCSRFTokenError()
  }
  next()
}
