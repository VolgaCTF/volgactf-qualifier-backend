mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

taskCategorySchema = mongoose.Schema
    title: { type: String, unique: yes }
    description: String
    createdAt: Date
    updatedAt: Date

taskCategorySchema.plugin autoIncrement.plugin, model: 'TaskCategory', startAt: 1
module.exports = mongoose.model 'TaskCategory', taskCategorySchema
