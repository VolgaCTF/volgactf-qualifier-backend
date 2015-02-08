mongoose = require 'mongoose'

mongoose.connect 'mongodb://localhost/themis'
mongoose.connection
    .on 'error', ->
        console.log 'Connection error'
    .once 'open', (callback) ->
        console.log 'Connected to MongoDB server'

module.exports = mongoose