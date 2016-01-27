import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'

let postSchema = mongoose.Schema({
  title: {
    type: String,
    unique: true
  },
  description: String,
  createdAt: Date,
  updatedAt: Date
})

postSchema.plugin(autoIncrement.plugin, { model: 'Post', startAt: 1 })

export default mongoose.model('Post', postSchema)
