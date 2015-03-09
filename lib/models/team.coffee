mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

teamSchema = mongoose.Schema
    name: String
    email: String
    passwordHash: String
    country: String
    locality: String
    institution: String

teamSchema.plugin autoIncrement.plugin, model: 'Team', startAt: 1
module.exports = mongoose.model 'Team', teamSchema
