import winston from 'winston'

let logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: process.env.THEMIS_LOGGING_LEVEL || 'info',
      timestamp: true,
      prettyPrint: true,
      colorize: true
    })
  ]
})

export default logger
