mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

categorySchema = mongoose.Schema
    title: { type: String, unique: yes }
    description: String
    createdAt: Date
    updatedAt: Date
    backgroundColor: Number
    textColor: Number

categorySchema.plugin autoIncrement.plugin, model: 'Category', startAt: 1
module.exports = mongoose.model 'Category', categorySchema
