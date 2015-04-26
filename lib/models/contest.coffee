mongoose = require '../utils/mongoose'
autoIncrement = require 'mongoose-auto-increment'
constants = require '../utils/constants'


contestSchema = mongoose.Schema
    state: Number  # 1 - initial, 2 - started, 3 - paused, 4 - finished
    startsAt: Date
    finishesAt: Date


contestSchema.methods.isInitial = ->
    @state is constants.CONTEST_INITIAL


contestSchema.methods.isStarted = ->
    @state is constants.CONTEST_STARTED


contestSchema.methods.isPaused = ->
    @state is constants.CONTEST_PAUSED


contestSchema.methods.isFinished = ->
    @state is constants.CONTEST_FINISHED


contestSchema.plugin autoIncrement.plugin, model: 'Contest', startAt: 1
module.exports = mongoose.model 'Contest', contestSchema
