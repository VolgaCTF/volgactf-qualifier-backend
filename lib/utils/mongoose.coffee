mongoose = require 'mongoose'
logger = require './logger'
autoIncrement = require 'mongoose-auto-increment'


mongoose.connect 'mongodb://localhost/themis'
autoIncrement.initialize mongoose.connection

mongoose.connection
    .on 'error', ->
        logger.info 'Connection error'
    .once 'open', (callback) ->
        logger.info 'Connected to MongoDB server'

module.exports = mongoose