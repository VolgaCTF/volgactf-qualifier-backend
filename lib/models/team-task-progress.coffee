mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

teamTaskProgressSchema = mongoose.Schema
    team: { type: Number, ref: 'Team' }
    task: { type: Number, ref: 'Task' }
    createdAt: Date

teamTaskProgressSchema.plugin autoIncrement.plugin, model: 'TeamTaskProgress', startAt: 1
module.exports = mongoose.model 'TeamTaskProgress', teamTaskProgressSchema
