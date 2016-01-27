import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'

let supervisorSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true
  },
  passwordHash: String,
  rights: String
})

supervisorSchema.plugin(autoIncrement.plugin, { model: 'Supervisor', startAt: 1 })

export default mongoose.model('Supervisor', supervisorSchema)
