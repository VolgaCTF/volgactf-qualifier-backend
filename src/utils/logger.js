const winston = require('winston')

module.exports = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: process.env.THEMIS_LOGGING_LEVEL || 'info',
      timestamp: true,
      prettyPrint: true,
      colorize: true
    })
  ]
})
