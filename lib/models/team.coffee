mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

teamSchema = mongoose.Schema
    name: { type: String, unique: yes }
    email: { type: String, unique: yes }
    emailConfirmed: Boolean
    passwordHash: String
    country: String
    locality: String
    institution: String

teamSchema.plugin autoIncrement.plugin, model: 'Team', startAt: 1
module.exports = mongoose.model 'Team', teamSchema
