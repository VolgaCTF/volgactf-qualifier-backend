import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'

let teamScoreSchema = mongoose.Schema({
  teamId: Number,
  score: Number,
  updatedAt: Date
})

teamScoreSchema.plugin(autoIncrement.plugin, { model: 'TeamScore', startAt: 1 })

export default mongoose.model('TeamScore', teamScoreSchema)
