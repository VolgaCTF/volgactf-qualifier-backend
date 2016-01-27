import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'
import constants from '../utils/constants'

let taskSchema = mongoose.Schema({
  title: {
    type: String,
    unique: true
  },
  description: String,
  createdAt: Date,
  updatedAt: Date,
  hints: [String],
  value: Number,
  categories: [Number],
  answers: [String],
  caseSensitive: Boolean,
  state: Number  // 1 - initial, 2 - opened, 3 - closed
})


taskSchema.methods.isInitial = function() {
  return this.state === constants.TASK_INITIAL
}


taskSchema.methods.isOpened = function() {
  return this.state === constants.TASK_OPENED
}


taskSchema.methods.isClosed = function() {
  return this.state === constants.TASK_CLOSED
}

taskSchema.plugin(autoIncrement.plugin, { model: 'Task', startAt: 1 })

export default mongoose.model('Task', taskSchema)
