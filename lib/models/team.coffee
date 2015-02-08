mongoose = require '../utils/mongoose'

teamSchema = mongoose.Schema
    id: mongoose.Schema.ObjectId
    name: String
    email: String
    passwordHash: String
    country: String
    locality: String
    institution: String

module.exports = mongoose.model 'Team', teamSchema
