import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'

let teamSchema = mongoose.Schema({
  name: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true,
    lowercase: true
  },
  createdAt: Date,
  emailConfirmed: Boolean,
  emailConfirmationToken: Buffer,
  passwordHash: String,
  country: String,
  locality: String,
  institution: String,
  disqualified: Boolean,
  resetPasswordToken: Buffer
})

teamSchema.plugin(autoIncrement.plugin, { model: 'Team', startAt: 1 })

export default mongoose.model('Team', teamSchema)
