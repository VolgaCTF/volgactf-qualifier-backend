import constants from '../utils/constants'
import Model from '../utils/model'

export default class Task extends Model {
  static tableName = 'tasks'

  isInitial () {
    return this.state === constants.TASK_INITIAL
  }

  isOpened () {
    return this.state === constants.TASK_OPENED
  }

  isClosed () {
    return this.state === constants.TASK_CLOSED
  }
}
