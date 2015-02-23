mongoose = require '../utils/mongoose'

supervisorSchema = mongoose.Schema
    username: String
    passwordHash: String
    rights: String

module.exports = mongoose.model 'Supervisor', supervisorSchema
