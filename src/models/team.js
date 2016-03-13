import Model from '../utils/model'

export default class Team extends Model {
  static tableName = 'teams'

  isQualified () {
    return this.emailConfirmed && !this.disqualified
  }
}
