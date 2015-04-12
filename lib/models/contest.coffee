mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

contestSchema = mongoose.Schema
    state: Number  # 1 - initial, 2 - started, 3 - paused, 4 - finished
    startsAt: Date
    finishesAt: Date

contestSchema.plugin autoIncrement.plugin, model: 'Contest', startAt: 1
module.exports = mongoose.model 'Contest', contestSchema
