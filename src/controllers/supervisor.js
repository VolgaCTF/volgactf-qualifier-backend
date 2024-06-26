const Supervisor = require('../models/supervisor')
const SupervisorInvitation = require('../models/supervisor-invitation')
const SupervisorTaskSubscription = require('../models/supervisor-task-subscription')
const { getPasswordHash, checkPassword } = require('../utils/security')
const { InvalidSupervisorCredentialsError, InternalError, SupervisorNotFoundError, SupervisorUsernameTakenError, SupervisorEmailTakenError } = require('../utils/errors')
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

  static isSupervisorEmailUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'supervisors_ndx_email_unique')
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
                    username,
                    passwordHash: hash,
                    rights: supervisorInvitation.rights,
                    email: supervisorInvitation.email
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
                  } else if (SupervisorController.isSupervisorEmailUniqueConstraintViolation(err)) {
                    reject(new SupervisorEmailTakenError())
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
            rights: options.rights,
            email: options.email
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
            } else if (SupervisorController.isSupervisorEmailUniqueConstraintViolation(err)) {
              callback(new SupervisorEmailTakenError(), null)
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
        transaction(Supervisor, SupervisorTaskSubscription, function (Supervisor, SupervisorTaskSubscription) {
          return SupervisorTaskSubscription
            .query()
            .delete()
            .where('supervisorId', supervisor.id)
            .then(function () {
              return Supervisor
                .query()
                .delete()
                .where('id', supervisor.id)
            })
        })
          .then(function () {
            EventController.push(new DeleteSupervisorEvent(supervisor), function () {
              callback(null)
            })
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

  static fetchByIdList (idList) {
    return new Promise(function (resolve, reject) {
      Supervisor
        .query()
        .whereIn('id', idList)
        .then(function (supervisors) {
          resolve(supervisors)
        })
        .catch(function (err) {
          reject(err)
        })
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
