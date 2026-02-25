const winston = require('winston')

module.exports = winston.createLogger({
  level: process.env.VOLGACTF_QUALIFIER_LOGGING_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.errors({ stack: true }), // ✅ include stack
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      // Print stack if available, otherwise message
      return stack
        ? `${timestamp} ${level}: ${stack}`
        : `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
})
