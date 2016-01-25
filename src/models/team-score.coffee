mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

teamScoreSchema = mongoose.Schema
    teamId: Number
    score: Number
    updatedAt: Date

teamScoreSchema.plugin autoIncrement.plugin, model: 'TeamScore', startAt: 1
module.exports = mongoose.model 'TeamScore', teamScoreSchema
