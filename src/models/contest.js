import mongoose from '../utils/mongoose'
import autoIncrement from 'mongoose-auto-increment'
import constants from '../utils/constants'


let contestSchema = mongoose.Schema({
  state: Number,  // 1 - initial, 2 - started, 3 - paused, 4 - finished
  startsAt: Date,
  finishesAt: Date
})


contestSchema.methods.isInitial = function() {
  return this.state === constants.CONTEST_INITIAL
}


contestSchema.methods.isStarted = function() {
  return this.state === constants.CONTEST_STARTED
}


contestSchema.methods.isPaused = function() {
  return this.state === constants.CONTEST_PAUSED
}


contestSchema.methods.isFinished = function() {
  return this.state === constants.CONTEST_FINISHED
}


contestSchema.plugin(autoIncrement.plugin, { model: 'Contest', startAt: 1 })

export default mongoose.model('Contest', contestSchema)
