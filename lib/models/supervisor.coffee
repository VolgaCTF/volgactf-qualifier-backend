mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

supervisorSchema = mongoose.Schema
    username: String
    passwordHash: String
    rights: String

supervisorSchema.plugin autoIncrement.plugin, model: 'Supervisor', startAt: 1
module.exports = mongoose.model 'Supervisor', supervisorSchema
