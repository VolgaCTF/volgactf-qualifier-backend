mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'

postSchema = mongoose.Schema
    title: String
    description: String
    createdAt: Date
    updatedAt: Date

postSchema.plugin autoIncrement.plugin, model: 'Post', startAt: 1
module.exports = mongoose.model 'Post', postSchema
