mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

logSchema = mongoose.Schema
    event: Number
    createdAt: Date
    data: mongoose.Schema.Types.Mixed

logSchema.plugin autoIncrement.plugin, model: 'Log', startAt: 1
module.exports = mongoose.model 'Log', logSchema
