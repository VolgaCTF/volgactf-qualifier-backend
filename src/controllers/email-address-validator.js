const logger = require('../utils/logger')
const { InternalError, EmailAddressValidationError } = require('../utils/errors')
const { validate: deepEmailValidate } = require('deep-email-validator')

class EmailAddressValidator {
  constructor () {
    const ignoreListStr = process.env.VOLGACTF_QUALIFIER_EMAIL_ADDRESS_VALIDATOR_IGNORE_LIST || ''
    this.ignoreList = ignoreListStr.split(',').filter(function (x) {
      return x.length > 0
    })
  }

  ignored (email) {
    return this.ignoreList.indexOf(email) !== -1
  }

  validate (email, ip) {
    const that = this
    return new Promise(function (resolve, reject) {
      if (that.ignored(email)) {
        resolve(email)
        return
      }

      const emailValidator = process.env.VOLGACTF_QUALIFIER_EMAIL_ADDRESS_VALIDATOR
      if (emailValidator === 'default') {
        deepEmailValidate({
          email,
          sender: email,
          validateRegex: false,
          validateMx: true,
          validateTypo: false,
          validateDisposable: true,
          validateSMTP: false
        })
          .then(function (res) {
            if (res.valid) {
              resolve(email)
            } else {
              if (!res.validators.typo.valid) {
                const suggested = res.validators.typo.reason.substring('Likely typo, suggested email: '.length)
                reject(new EmailAddressValidationError(`This email address seems to be invalid. Did you mean ${suggested}?`))
              } else if (!res.validators.disposable.valid) {
                reject(new EmailAddressValidationError('The use of a disposable email address is not allowed'))
              } else if (!res.validators.mx.valid) {
                reject(new EmailAddressValidationError('This email address seems to be undeliverable. Please check the spelling'))
              } else {
                reject(new InternalError())
              }
            }
          })
          .catch(function (err) {
            logger.error(err)
            reject(new InternalError())
          })
      } else {
        resolve(email)
      }
    })
  }
}

module.exports = new EmailAddressValidator()
