import TaskAnswer from '../models/task-answer'
import { InternalError } from '../utils/errors'
import logger from '../utils/logger'

class TaskAnswerController {
  static listByTask (taskId, callback) {
    TaskAnswer
      .query()
      .where('taskId', taskId)
      .orderBy('id')
      .then((taskAnswers) => {
        callback(null, taskAnswers)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TaskAnswerController
