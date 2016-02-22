import TaskHint from '../models/task-hint'
import { InternalError } from '../utils/errors'
import logger from '../utils/logger'

class TaskHintController {
  static listByTask (taskId, callback) {
    TaskHint
      .query()
      .where('taskId', taskId)
      .orderBy('id')
      .then((taskHints) => {
        callback(null, taskHints)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TaskHintController
