const Supervisor = require('../models/supervisor')
const SupervisorInvitation = require('../models/supervisor-invitation')
const { getPasswordHash, checkPassword } = require('../utils/security')
const { InvalidSupervisorCredentialsError, InternalError, SupervisorNotFoundError, SupervisorUsernameTakenError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const logger = require('../utils/logger')
const EventController = require('./event')
const LoginSupervisorEvent = require('../events/login-supervisor')
const CreateSupervisorEvent = require('../events/create-supervisor')
const DeleteSupervisorEvent = require('../events/delete-supervisor')
const UpdateSupervisorPasswordEvent = require('../events/update-supervisor-password')

const supervisorInvitationController = require('./supervisor-invitation')
const { transaction } = require('objection')

class SupervisorController {
  static isSupervisorUsernameUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'supervisors_ndx_username_unique')
  }

  static createFromInvitation (code, username, password) {
    return new Promise(function (resolve, reject) {
      let newSupervisor = null
      supervisorInvitationController
      .find(code)
      .then(function (supervisorInvitation) {
        getPasswordHash(password, function (err, hash) {
          if (err) {
            logger.error(err)
            reject(new InternalError())
          } else {
            transaction(Supervisor, SupervisorInvitation, function (Supervisor, SupervisorInvitation) {
              return Supervisor
              .query()
              .insert({
                username: username,
                passwordHash: hash,
                rights: supervisorInvitation.rights
              })
              .then(function (supervisor) {
                newSupervisor = supervisor
                return SupervisorInvitation
                .query()
                .patchAndFetchById(supervisorInvitation.id, {
                  used: true
                })
              })
            })
            .then(function () {
              if (newSupervisor) {
                EventController.push(new CreateSupervisorEvent(newSupervisor))
              }
              resolve(newSupervisor)
            })
            .catch(function (err) {
              if (SupervisorController.isSupervisorUsernameUniqueConstraintViolation(err)) {
                reject(new SupervisorUsernameTakenError())
              } else {
                logger.error(err)
                reject(new InternalError())
              }
            })
          }
        })
      })
      .catch(function (err) {
        reject(err)
      })
    })
  }

  static create (options, callback) {
    getPasswordHash(options.password, function (err, hash) {
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
          .then(function (supervisor) {
            EventController.push(new CreateSupervisorEvent(supervisor), function (err, event) {
              if (err) {
                callback(err, null)
              } else {
                callback(null, supervisor)
              }
            })
          })
          .catch(function (err) {
            if (SupervisorController.isSupervisorUsernameUniqueConstraintViolation(err)) {
              callback(new SupervisorUsernameTakenError(), null)
            } else {
              logger.error(err)
              callback(new InternalError(), null)
            }
          })
      }
    })
  }

  static edit (options, callback) {
    getPasswordHash(options.password, function (err, hash) {
      if (err) {
        logger.error(err)
        callback(new InternalError(), null)
      } else {
        SupervisorController.getByUsername(options.username, function (err, supervisor) {
          if (err) {
            logger.error(err)
            callback(err)
          } else {
            Supervisor
              .query()
              .patchAndFetchById(supervisor.id, {
                passwordHash: hash
              })
              .then(function (supervisor) {
                EventController.push(new UpdateSupervisorPasswordEvent(supervisor), function (err, event) {
                  if (err) {
                    callback(err, null)
                  } else {
                    callback(null, supervisor)
                  }
                })
              })
              .catch(function (err) {
                logger.error(err)
                callback(new InternalError(), null)
              })
          }
        })
      }
    })
  }

  static delete (username, callback) {
    SupervisorController.getByUsername(username, function (err, supervisor) {
      if (err) {
        logger.error(err)
        callback(err)
      } else {
        Supervisor
          .query()
          .delete()
          .where('id', supervisor.id)
          .then(function (numDeleted) {
            if (numDeleted === 0) {
              callback(new SupervisorNotFoundError())
            } else {
              EventController.push(new DeleteSupervisorEvent(supervisor), function (err, event) {
                if (err) {
                  callback(err)
                } else {
                  callback(null)
                }
              })
            }
          })
          .catch(function (err) {
            callback(err)
          })
      }
    })
  }

  static login (opts) {
    return new Promise(function (resolve, reject) {
      Supervisor
      .query()
      .where('username', opts.username)
      .first()
      .then(function (supervisor) {
        if (supervisor) {
          checkPassword(opts.password, supervisor.passwordHash, function (err, res) {
            if (err) {
              reject(err)
            } else {
              if (res) {
                EventController.push(new LoginSupervisorEvent(supervisor, opts.countryName, opts.cityName))
                resolve(supervisor)
              } else {
                reject(new InvalidSupervisorCredentialsError())
              }
            }
          })
        } else {
          reject(new InvalidSupervisorCredentialsError())
        }
      })
      .catch(function (err) {
        reject(err)
      })
    })
  }

  static index (callback) {
    Supervisor
      .query()
      .then(function (supervisors) {
        callback(null, supervisors)
      })
      .catch(function (err) {
        callback(err, null)
      })
  }

  static getByUsername (username, callback) {
    Supervisor
      .query()
      .where('username', username)
      .first()
      .then(function (supervisor) {
        if (supervisor) {
          callback(null, supervisor)
        } else {
          callback(new SupervisorNotFoundError(), null)
        }
      })
      .catch(function (err) {
        callback(err, null)
      })
  }

  static get (id, callback) {
    Supervisor
      .query()
      .where('id', id)
      .first()
      .then(function (supervisor) {
        if (supervisor) {
          callback(null, supervisor)
        } else {
          callback(new SupervisorNotFoundError(), null)
        }
      })
      .catch(function (err) {
        callback(err, null)
      })
  }
}

module.exports = SupervisorController
