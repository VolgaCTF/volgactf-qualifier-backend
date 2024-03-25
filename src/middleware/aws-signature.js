const { InvalidAWSSignatureError } = require('../utils/errors')
const logger = require('../utils/logger')

const crypto = require('crypto')
const requestretry = require('requestretry')
const LRU = require('lru-cache')

function fieldsForSignature (type) {
  if (type === 'SubscriptionConfirmation' || type === 'UnsubscribeConfirmation') {
    return ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
  } else if (type === 'Notification') {
    return ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
  } else {
    return []
  }
}

const CERT_CACHE = new LRU({ max: 1000, maxAge: 1000 * 60 * 5 })

function fetchCert (certUrl, cb) {
  const cachedCertificate = CERT_CACHE.get(certUrl)
  if (cachedCertificate !== undefined) {
    cb(null, cachedCertificate)
  } else {
    requestretry({
      method: 'GET',
      url: certUrl,
      maxAttempts: 3,
      retryDelay: 100,
      timeout: 3000
    }, function (err, res, certificate) {
      if (err) {
        cb(err)
      } else {
        if (res.statusCode === 200) {
          CERT_CACHE.set(certUrl, certificate)
          cb(null, certificate)
        } else {
          cb(new Error(`expected 200 status code, received: ${res.statusCode}`))
        }
      }
    })
  }
}

const CERT_URL_PATTERN = /^https:\/\/sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?\/SimpleNotificationService-[a-zA-Z0-9]{32}\.pem$/

function validate (message, cb) {
  if (!('SignatureVersion' in message && 'SigningCertURL' in message && 'Type' in message && 'Signature' in message)) {
    logger.error('missing field')
    cb(null, false)
  } else if (message.SignatureVersion !== '1') {
    logger.error('invalid SignatureVersion')
    cb(null, false)
  } else if (!CERT_URL_PATTERN.test(message.SigningCertURL)) {
    logger.error('invalid certificate URL')
    cb(null, false)
  } else {
    fetchCert(message.SigningCertURL, function (err, certificate) {
      if (err) {
        cb(err)
      } else {
        const verify = crypto.createVerify('sha1WithRSAEncryption')
        fieldsForSignature(message.Type).forEach(function (key) {
          if (key in message) {
            verify.write(`${key}\n${message[key]}\n`)
          }
        })
        verify.end()
        const result = verify.verify(certificate, message.Signature, 'base64')
        cb(null, result)
      }
    })
  }
}

function verifyAwsSignature (request, response, next) {
  validate(request.body, function (err, result) {
    if (err) {
      logger.error(err)
      next(err)
    } else {
      if (!result) {
        next(new InvalidAWSSignatureError())
      } else {
        next()
      }
    }
  })
}

function overrideContentType (request, response, next) {
  if (request.headers['x-amz-sns-message-type']) {
    request.headers['content-type'] = 'application/json;charset=UTF-8'
  }
  next()
}

module.exports = {
  verifyAwsSignature,
  overrideContentType
}
