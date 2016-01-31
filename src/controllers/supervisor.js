import Supervisor from '../models/supervisor'
import { getPasswordHash, checkPassword } from '../utils/security'
import { InvalidSupervisorCredentialsError } from '../utils/errors'


class SupervisorController {
  static create(options, callback) {
    Supervisor
      .query()
      .where('username', options.username)
      .first()
      .then((supervisor) => {
        if (supervisor) {
          callback('Supervisor exists!', null)
        } else {
          getPasswordHash(options.password, (err, hash) => {
            if (err) {
              callback(err, null)
            } else {
              Supervisor
                .query()
                .insert({
                  username: options.username,
                  passwordHash: hash,
                  rights: options.rights
                })
                .then((supervisor) => {
                  callback(null, supervisor)
                })
                .catch((err) => {
                  callback(err, null)
                })
            }
          })
        }
      })
      .catch((err) => {
        callback(err, null)
      })
  }

  static remove(username, callback) {
    Supervisor
      .query()
      .delete()
      .where('username', username)
      .then((numDeleted) => {
        if (numDeleted === 0) {
          callback("Supervisor doesn't exist!")
        } else {
          callback(null)
        }
      })
      .catch((err) => {
        callback(err)
      })
  }

  static login(username, password, callback) {
    Supervisor
      .query()
      .where('username', username)
      .first()
      .then((supervisor) => {
        if (supervisor) {
          checkPassword(password, supervisor.passwordHash, (err, res) => {
            if (err) {
              callback(err, null)
            } else {
              if (res) {
                callback(null, supervisor)
              } else {
                callback(new InvalidSupervisorCredentialsError(), null)
              }
            }
          })
        } else {
          callback(new InvalidSupervisorCredentialsError(), null)
        }
      })
      .catch((err) => {
        callback(err, null)
      })
  }

  static list(callback) {
    Supervisor
      .query()
      .then((supervisors) => {
        callback(null, supervisors)
      })
      .catch((err) => {
        callback(err, null)
      })
  }

  static get(id, callback) {
    Supervisor
      .query()
      .where('id', id)
      .first()
      .then((supervisor) => {
        if (supervisor) {
          callback(null, supervisor)
        } else {
          callback('Supervisor not found!', null)
        }
      })
      .catch((err) => {
        callback(err, null)
      })
  }
}


export default SupervisorController
