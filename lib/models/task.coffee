mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

taskSchema = mongoose.Schema
    title: { type: String, unique: yes }
    description: String
    createdAt: Date
    updatedAt: Date
    hints: [String]
    value: Number
    categories: [Number]
    answers: [String]
    caseSensitive: Boolean
    state: Number  # 1 - initial, 2 - opened, 3 - closed

taskSchema.plugin autoIncrement.plugin, model: 'Task', startAt: 1
module.exports = mongoose.model 'Task', taskSchema
