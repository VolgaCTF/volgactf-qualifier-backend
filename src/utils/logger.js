import winston from 'winston'

let logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      timestamp: true,
      prettyPrint: true
    })
  ]
})

export default logger
