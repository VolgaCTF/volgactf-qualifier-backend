import Model from '../utils/model'


export default class Post extends Model {
  static get tableName() {
    return 'posts'
  }
}
