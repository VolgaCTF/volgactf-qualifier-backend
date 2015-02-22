winston = require 'winston'

logger = new winston.Logger
    transports: [
        new winston.transports.Console()
    ]

module.exports = winston
