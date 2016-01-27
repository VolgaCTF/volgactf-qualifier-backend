import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'

let taskCategorySchema = mongoose.Schema({
  title: {
    type: String,
    unique: true
  },
  description: String,
  createdAt: Date,
  updatedAt: Date
})

taskCategorySchema.plugin(autoIncrement.plugin, { model: 'TaskCategory', startAt: 1 })

export default mongoose.model('TaskCategory', taskCategorySchema)
