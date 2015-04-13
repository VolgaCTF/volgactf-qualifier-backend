mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

progressSchema = mongoose.Schema
    team: { type: Number, ref: 'Team' }
    task: { type: Number, ref: 'Task' }
    createdAt: Date

progressSchema.plugin autoIncrement.plugin, model: 'Progress', startAt: 1
module.exports = mongoose.model 'Progress', progressSchema
