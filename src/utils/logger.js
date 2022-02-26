const winston = require('winston')

module.exports = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: process.env.VOLGACTF_QUALIFIER_LOGGING_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.prettyPrint(),
        winston.format.simple()
      )
    })
  ]
})
