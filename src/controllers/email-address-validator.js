const logger = require('../utils/logger')
const mailgun = require('mailgun-js')
const { InternalError, EmailAddressValidationError } = require('../utils/errors')

class EmailAddressValidator {
  validate (email) {
    return new Promise(function (resolve, reject) {
      if (process.env.THEMIS_QUALS_EMAIL_ENFORCE_ADDRESS_VALIDATION === 'yes') {
        if (process.env.THEMIS_QUALS_EMAIL_TRANSPORT === 'mailgun') {
          const client = mailgun({
            apiKey: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN
          })

          client.validate(email, true, { mailbox_verification: true }, function (err, body) {
            if (err) {
              logger.error(err)
              reject(new InternalError())
            } else {
              if (body) {
                if (body.is_valid) {
                  if (body.mailbox_verification === 'true' || body.mailbox_verification === 'unknown') {
                    if (body.is_disposable_address) {
                      reject(new EmailAddressValidationError('The use of a disposable email address is not allowed'))
                    } else {
                      resolve(email)
                    }
                  } else {
                    reject(new EmailAddressValidationError('This email address seems to be undeliverable. Please check the spelling'))
                  }
                } else {
                  let msg = 'This email address seems to be invalid'
                  if (body.did_you_mean) {
                    msg = `${msg}. Did you mean ${body.did_you_mean}?`
                  }
                  reject(new EmailAddressValidationError(msg))
                }
              } else {
                logger.error('Body not present')
                reject(new InternalError())
              }
            }
          })
        } else {
          resolve(email)
        }
      } else {
        resolve(email)
      }
    })
  }
}

module.exports = new EmailAddressValidator()
