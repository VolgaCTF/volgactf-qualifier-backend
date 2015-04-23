queue = require './utils/queue'

queueTask = ->
    queue('updateScoresQueue').add()

module.exports.run = ->
    setInterval queueTask, 60000
