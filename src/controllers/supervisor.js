import Supervisor from '../models/supervisor'
import { getPasswordHash, checkPassword } from '../utils/security'
import { InvalidSupervisorCredentialsError, InternalError } from '../utils/errors'
import constants from '../utils/constants'
import logger from '../utils/logger'
import EventController from './event'
import LoginSupervisorEvent from '../events/login-supervisor'
import CreateSupervisorEvent from '../events/create-supervisor'
import DeleteSupervisorEvent from '../events/delete-supervisor'

class SupervisorController {
  static isSupervisorUsernameUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'supervisors_ndx_username_unique')
  }

  static create (options, callback) {
    getPasswordHash(options.password, (err, hash) => {
      if (err) {
        logger.error(err)
        callback(new InternalError(), null)
      } else {
        Supervisor
          .query()
          .insert({
            username: options.username,
            passwordHash: hash,
            rights: options.rights
          })
          .then((supervisor) => {
            EventController.push(new CreateSupervisorEvent(supervisor), (err, event) => {
              if (err) {
                callback(err, null)
              } else {
                callback(null, supervisor)
              }
            })
          })
          .catch((err) => {
            if (this.isSupervisorUsernameUniqueConstraintViolation(err)) {
              callback('Supervisor exists!', null)
            } else {
              logger.error(err)
              callback(new InternalError(), null)
            }
          })
      }
    })
  }

  static delete (username, callback) {
    this.getByUsername(username, (err, supervisor) => {
      if (err) {
        logger.error(err)
        callback(err)
      } else {
        Supervisor
          .query()
          .delete()
          .where('id', supervisor.id)
          .then((numDeleted) => {
            if (numDeleted === 0) {
              callback("Supervisor doesn't exist!")
            } else {
              EventController.push(new DeleteSupervisorEvent(supervisor), (err, event) => {
                if (err) {
                  callback(err)
                } else {
                  callback(null)
                }
              })
            }
          })
          .catch((err) => {
            callback(err)
          })
      }
    })
  }

  static login (username, password, callback) {
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
                EventController.push(new LoginSupervisorEvent(supervisor))
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

  static index (callback) {
    Supervisor
      .query()
      .then((supervisors) => {
        callback(null, supervisors)
      })
      .catch((err) => {
        callback(err, null)
      })
  }

  static getByUsername (username, callback) {
    Supervisor
      .query()
      .where('username', username)
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

  static get (id, callback) {
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
