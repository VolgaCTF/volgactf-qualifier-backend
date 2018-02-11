const TaskController = require('../controllers/task')

function getTask (request, response, next) {
  TaskController.get(request.taskId, function (err, task) {
    if (err) {
      next(err)
    } else {
      request.task = task
      next()
    }
  })
}

module.exports.getTask = getTask
