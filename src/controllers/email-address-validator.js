const logger = require('../utils/logger')
const mailgun = require('mailgun-js')
const { InternalError, EmailAddressValidationError } = require('../utils/errors')
const request = require('request')

class EmailAddressValidator {
  validate (email, ip) {
    return new Promise(function (resolve, reject) {
      const emailValidator = process.env.VOLGACTF_QUALIFIER_EMAIL_ADDRESS_VALIDATOR
      if (emailValidator === 'mailgun') {
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
      } else if (emailValidator === 'zerobounce') {
        const params = {
          method: 'GET',
          url: 'https://api.zerobounce.net/v2/validate',
          qs: {
            api_key: process.env.ZEROBOUNCE_API_KEY,
            email: email,
            ip_address: ip
          },
          timeout: 10000,
          json: true
        }
        request(params, function (err, response, body) {
          if (err) {
            logger.error(err)
            reject(new InternalError())
          } else {
            if (body.hasOwnProperty('status') && body.hasOwnProperty('sub_status')) {
              if (body.status === 'valid') {
                resolve(email)
              } else if (body.status === 'do_not_mail' && body.sub_status === 'role_based') {
                resolve(email)
              } else if (body.status === 'do_not_mail' && body.sub_status === 'disposable') {
                reject(new EmailAddressValidationError('The use of a disposable email address is not allowed'))
              } else if (body.status === 'invalid' && body.sub_status === 'possible_typo' && body.hasOwnProperty('did_you_mean')) {
                let msg = 'This email address seems to be invalid'
                if (body.did_you_mean) {
                  msg = `${msg}. Did you mean ${body.did_you_mean}?`
                }
                reject(new EmailAddressValidationError(msg))
              } else {
                reject(new EmailAddressValidationError('This email address seems to be undeliverable. Please check the spelling or try submitting the form later'))
              }
            } else {
              logger.error(body)
              reject(new InternalError())
            }
          }
        })
      } else if (emailValidator === 'mailboxlayer') {
        const params = {
          method: 'GET',
          url: 'https://apilayer.net/api/check',
          qs: {
            access_key: process.env.MAILBOXLAYER_API_KEY,
            email: email
          },
          timeout: 10000,
          json: true
        }
        request(params, function (err, response, body) {
          if (err) {
            logger.error(err)
            reject(new InternalError())
          } else {
            if (body.hasOwnProperty('format_valid') && body.hasOwnProperty('score') && body.hasOwnProperty('disposable') && body.hasOwnProperty('did_you_mean')) {
              if (body.disposable) {
                reject(new EmailAddressValidationError('The use of a disposable email address is not allowed'))
              } else if (body.did_you_mean && body.did_you_mean.length > 0) {
                reject(new EmailAddressValidationError(`This email address seems to be invalid. Did you mean ${body.did_you_mean}?`))
              } else if (body.format_valid && body.score >= 0.65) {
                resolve(email)
              } else {
                reject(new EmailAddressValidationError('This email address seems to be undeliverable. Please check the spelling'))
              }
            } else {
              logger.error(body)
              reject(new InternalError())
            }
          }
        })
      } else if (emailValidator === 'thechecker') {
        const params = {
          method: 'GET',
          url: 'https://api.thechecker.co/v2/verify',
          qs: {
            api_key: process.env.THECHECKER_API_KEY,
            email: email
          },
          timeout: 10000,
          json: true
        }
        request(params, function (err, response, body) {
          if (err) {
            logger.error(err)
            reject(new InternalError())
          } else {
            if (body.hasOwnProperty('result') && body.hasOwnProperty('reason')) {
              if (body.hasOwnProperty('did_you_mean') && body.did_you_mean && body.did_you_mean.length > 0) {
                reject(new EmailAddressValidationError(`This email address seems to be invalid. Did you mean ${body.did_you_mean}?`))
              } else if (body.result === 'risky' && body.reason === 'disposable') {
                reject(new EmailAddressValidationError('The use of a disposable email address is not allowed'))
              } else if (body.result === 'deliverable' || (body.result === 'risky' && body.reason === 'role')) {
                resolve(email)
              } else {
                reject(new EmailAddressValidationError('This email address seems to be undeliverable. Please check the spelling'))
              }
            } else {
              logger.error(body)
              reject(new InternalError())
            }
          }
        })
      } else {
        resolve(email)
      }
    })
  }
}

module.exports = new EmailAddressValidator()
