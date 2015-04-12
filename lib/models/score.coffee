mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

scoreSchema = mongoose.Schema
    team: { type: Number, ref: 'Team' }
    score: Number

scoreSchema.plugin autoIncrement.plugin, model: 'Score', startAt: 1
module.exports = mongoose.model 'Score', scoreSchema
