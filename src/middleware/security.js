import { InvalidCSRFTokenError } from '../utils/errors'
import tokenUtil from '../utils/token'
import moment from 'moment'

let tokenExpirationDate = 1000 * 60 * 60  // 1 hour
if (process.env.TOKEN_EXPIRATION_DATE) {
  tokenExpirationDate = parseInt(process.env.TOKEN_EXPIRATION_DATE, 10)
}

export function checkToken (request, response, next) {
  let validToken = null

  if (request.session.token && request.session.tokenExpires && request.get('X-CSRF-Token')) {
    let diff = moment().diff(request.session.tokenExpires)
    validToken = (diff < 0) && (request.get('X-CSRF-Token') === request.session.token)
  } else {
    validToken = false
  }

  if (!validToken) {
    throw new InvalidCSRFTokenError()
  }
  next()
}

export function issueToken (request, response, next) {
  let reissueToken = null

  if (request.session.token && request.session.tokenExpires) {
    let diff = moment().diff(request.session.tokenExpires)
    reissueToken = diff > 0
  } else {
    reissueToken = true
  }

  if (reissueToken) {
    request.session.token = tokenUtil.encode(tokenUtil.generate(32))
    request.session.tokenExpires = moment().add(tokenExpirationDate).valueOf()
  }

  next()
}
