mongoose = require 'mongoose'
logger = require './logger'

mongoose.connect 'mongodb://localhost/themis'
mongoose.connection
    .on 'error', ->
        logger.info 'Connection error'
    .once 'open', (callback) ->
        logger.info 'Connected to MongoDB server'

module.exports = mongoose