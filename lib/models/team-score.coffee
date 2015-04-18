mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

teamScoreSchema = mongoose.Schema
    team: { type: Number, ref: 'Team' }
    score: Number
    updatedAt: Date

teamScoreSchema.plugin autoIncrement.plugin, model: 'TeamScore', startAt: 1
module.exports = mongoose.model 'TeamScore', teamScoreSchema
