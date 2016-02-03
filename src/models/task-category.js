import Model from '../utils/model'


export default class TaskCategory extends Model {
  static get tableName() {
    return 'task_categories'
  }
}
