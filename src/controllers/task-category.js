import TaskCategory from '../models/task-category'
import { InternalError } from '../utils/errors'
import logger from '../utils/logger'

class TaskCategoryController {
  static list (callback) {
    TaskCategory
      .query()
      .then((taskCategories) => {
        callback(null, taskCategories)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TaskCategoryController
