winston = require 'winston'

logger = new winston.Logger
    transports: [
        new winston.transports.Console
            level: 'info'
            timestamp: yes
            prettyPrint: yes
    ]

module.exports = logger
