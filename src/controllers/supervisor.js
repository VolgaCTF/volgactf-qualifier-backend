import Supervisor from '../models/supervisor'
import security from '../utils/security'
import { InvalidSupervisorCredentialsError } from '../utils/errors'


class SupervisorController {
  static create(options, callback) {
    Supervisor.findOne({ username: options.username }, (err, supervisor) => {
      if (supervisor) {
        callback('Supervisor exists!', null)
      } else {
        security.getPasswordHash(options.password, (err, hash) => {
          if (err) {
            callback(err, null)
          } else {
            let supervisor = new Supervisor({
              username: options.username,
              passwordHash: hash,
              rights: options.rights
            })

            supervisor.save((err, supervisor) => {
              if (err) {
                callback(err, null)
              } else {
                callback(null, supervisor)
              }
            })
          }
        })
      }
    })
  }

  static remove(username, callback) {
    Supervisor.remove({ username: username }, (err) => {
      if (err) {
        callback('Supervisor does not exist!')
      } else {
        callback(null)
      }
    })
  }

  static login(username, password, callback) {
    Supervisor.findOne({ username: username }, (err, supervisor) => {
      if (supervisor) {
        security.checkPassword(password, supervisor.passwordHash, (err, res) => {
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
  }

  static list(callback) {
    Supervisor.find((err, supervisors) => {
      if (err) {
        callback(err, null)
      } else {
        callback(null, supervisors)
      }
    })
  }

  static get(id, callback) {
    Supervisor.findOne({ _id: id }, (err, supervisor) => {
      if (err) {
        callback('Supervisor not found!', null)
      } else {
        callback(null, supervisor)
      }
    })
  }
}


export default SupervisorController
