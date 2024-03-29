const taskFileController = require('../controllers/task-file')

function getTaskFile (request, response, next) {
  taskFileController
    .fetchById(request.taskFileId)
    .then(function (taskFile) {
      request.taskFile = taskFile
      next()
    })
    .catch(function (err) {
      next(err)
    })
}

module.exports.getTaskFile = getTaskFile
