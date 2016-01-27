import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'

let logSchema = mongoose.Schema({
  event: Number,
  createdAt: Date,
  data: mongoose.Schema.Types.Mixed
})

logSchema.plugin(autoIncrement.plugin, { model: 'Log', startAt: 1 })

export default mongoose.model('Log', logSchema)
