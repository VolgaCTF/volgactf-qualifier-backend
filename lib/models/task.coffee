mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'
constants = require '../utils/constants'

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


taskSchema.methods.isInitial = ->
    @state is constants.TASK_INITIAL


taskSchema.methods.isOpened = ->
    @state is constants.TASK_OPENED


taskSchema.methods.isClosed = ->
    @state is constants.TASK_CLOSED


taskSchema.plugin autoIncrement.plugin, model: 'Task', startAt: 1
module.exports = mongoose.model 'Task', taskSchema
