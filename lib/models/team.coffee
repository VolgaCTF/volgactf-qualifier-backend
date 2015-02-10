mongoose = require '../utils/mongoose'

teamSchema = mongoose.Schema
    name: String
    email: String
    passwordHash: String
    passwordSalt: String
    country: String
    locality: String
    institution: String

module.exports = mongoose.model 'Team', teamSchema