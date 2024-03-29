const token = require('../utils/token')
const { InvalidCTFtimeOAuthStateError, InternalError } = require('../utils/errors')
const requestlib = require('request')
const logger = require('../utils/logger')

class CTFtimeOAuthController {
  isEnabled () {
    return Object.hasOwn(process.env, 'CTFTIME_OAUTH_CLIENT_ID') &&
      process.env.CTFTIME_OAUTH_CLIENT_ID !== '' &&
      Object.hasOwn(process.env, 'CTFTIME_OAUTH_CLIENT_SECRET') &&
      process.env.CTFTIME_OAUTH_CLIENT_SECRET !== ''
  }

  getCallbackLink () {
    return `http${process.env.VOLGACTF_QUALIFIER_SECURE === 'yes' ? 's' : ''}://${process.env.VOLGACTF_QUALIFIER_FQDN}/team/ctftime/oauth/complete`
  }

  generateState () {
    return token.encode(token.generate(48))
  }

  setupState (request) {
    request.session.oAuthState = this.generateState()
  }

  clearState (request) {
    request.session.oAuthState = null
  }

  getRedirectLink (request) {
    const u = new URL(process.env.CTFTIME_OAUTH_AUTHORIZATION_SERVER_ENDPOINT)
    u.searchParams.append('response_type', 'code')
    u.searchParams.append('client_id', process.env.CTFTIME_OAUTH_CLIENT_ID)
    u.searchParams.append('redirect_uri', this.getCallbackLink())
    u.searchParams.append('scope', process.env.CTFTIME_OAUTH_SCOPE)
    u.searchParams.append('state', request.session.oAuthState)
    return u.toString()
  }

  processCallback (request) {
    return new Promise((resolve, reject) => {
      if (request.query.state !== request.session.oAuthState) {
        reject(new InvalidCTFtimeOAuthStateError())
        return
      }

      const params = {
        method: 'POST',
        url: process.env.CTFTIME_OAUTH_ACCESS_TOKEN_ENDPOINT,
        json: true,
        form: {
          grant_type: 'authorization_code',
          code: request.query.code,
          redirect_uri: this.getCallbackLink(),
          client_id: process.env.CTFTIME_OAUTH_CLIENT_ID,
          client_secret: process.env.CTFTIME_OAUTH_CLIENT_SECRET
        }
      }

      requestlib(params, function (err, resp, body) {
        if (err) {
          logger.error(err)
          reject(new InternalError())
        } else {
          const accessToken = body.access_token

          const params2 = {
            method: 'GET',
            url: process.env.CTFTIME_OAUTH_API_ENDPOINT,
            json: true,
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }

          requestlib(params2, function (err2, resp2, body2) {
            if (err2) {
              logger.error(err2)
              reject(new InternalError())
            } else {
              if (Object.hasOwn(body2, 'error')) {
                reject(new InternalError())
              } else {
                resolve(body2)
              }
            }
          })
        }
      })
    })
  }
}

module.exports = new CTFtimeOAuthController()
