mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

teamTaskProgressSchema = mongoose.Schema
    teamId: Number
    taskId: Number
    createdAt: Date

teamTaskProgressSchema.plugin autoIncrement.plugin, model: 'TeamTaskProgress', startAt: 1
module.exports = mongoose.model 'TeamTaskProgress', teamTaskProgressSchema
