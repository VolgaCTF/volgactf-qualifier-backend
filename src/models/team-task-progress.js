import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'

let teamTaskProgressSchema = mongoose.Schema({
  teamId: Number,
  taskId: Number,
  createdAt: Date
})

teamTaskProgressSchema.plugin(autoIncrement.plugin, { model: 'TeamTaskProgress', startAt: 1 })

export default mongoose.model('TeamTaskProgress', teamTaskProgressSchema)
