const Team = require('../models/team')
const TeamResetPasswordToken = require('../models/team-reset-password-token')
const TeamEmailVerificationToken = require('../models/team-email-verification-token')
const TeamScore = require('../models/team-score')
const { getPasswordHash, checkPassword } = require('../utils/security')
const queue = require('../utils/queue')
const token = require('../utils/token')
const logger = require('../utils/logger')
const { InternalError, TeamNotFoundError, TeamCredentialsTakenError, InvalidTeamCredentialsError, EmailConfirmedError,
  EmailTakenError, InvalidTeamPasswordError, InvalidResetPasswordURLError, InvalidVerificationURLError,
  ResetPasswordAttemptsLimitError, EmailVerificationAttemptsLimitError, TeamNotQualifiedError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const moment = require('moment')
const { transaction } = require('objection')

const EventController = require('./event')
const CreateTeamEvent = require('../events/create-team')
const UpdateTeamEmailEvent = require('../events/update-team-email')
const UpdateTeamProfileEvent = require('../events/update-team-profile')
const QualifyTeamEvent = require('../events/qualify-team')
const LoginTeamEvent = require('../events/login-team')
const UpdateTeamPasswordEvent = require('../events/update-team-password')
const DisqualifyTeamEvent = require('../events/disqualify-team')

class TeamController {
  static restore (email, callback) {
    Team
      .query()
      .where('email', email.toLowerCase())
      .first()
      .then(function (team) {
        if (team) {
          TeamResetPasswordToken
            .query()
            .where('teamId', team.id)
            .andWhere('used', false)
            .andWhere('expiresAt', '>', new Date())
            .then(function (teamResetPasswordTokens) {
              if (teamResetPasswordTokens.length >= 2) {
                callback(new ResetPasswordAttemptsLimitError())
              } else {
                TeamResetPasswordToken
                  .query()
                  .insert({
                    teamId: team.id,
                    token: token.generate(),
                    used: false,
                    createdAt: new Date(),
                    expiresAt: moment().add(1, 'h').toDate()
                  })
                  .then(function (teamResetPasswordToken) {
                    queue('sendEmailQueue').add({
                      message: 'restore',
                      name: team.name,
                      email: team.email,
                      token: teamResetPasswordToken.token,
                      teamId: team.id
                    })
                    callback(null)
                  })
                  .catch(function (err) {
                    logger.error(err)
                    callback(new InternalError())
                  })
              }
            })
            .catch(function (err) {
              logger.error(err)
              callback(new InternalError())
            })
        } else {
          callback(new TeamNotFoundError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static isTeamNameUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'teams_ndx_name_unique')
  }

  static isTeamEmailUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'teams_ndx_email_unique')
  }

  static create (options, callback) {
    getPasswordHash(options.password, function (err, hash) {
      if (err) {
        logger.error(err)
        callback(new InternalError())
      } else {
        let team = null
        let teamEmailVerificationToken = null

        transaction(Team, TeamEmailVerificationToken, function (Team, TeamEmailVerificationToken) {
          return Team
            .query()
            .insert({
              name: options.team,
              email: options.email,
              createdAt: new Date(),
              emailConfirmed: false,
              passwordHash: hash,
              countryId: options.countryId,
              locality: options.locality,
              institution: '',
              disqualified: false
            })
            .then(function (newTeam) {
              team = newTeam
              return TeamEmailVerificationToken
                .query()
                .insert({
                  teamId: newTeam.id,
                  token: token.generate(),
                  used: false,
                  createdAt: new Date(),
                  expiresAt: moment().add(1, 'h').toDate()
                })
                .then(function (newTeamEmailVerificationToken) {
                  teamEmailVerificationToken = newTeamEmailVerificationToken
                })
            })
        })
        .then(function () {
          if (options.logoFilename) {
            queue('createLogoQueue').add({
              id: team.id,
              filename: options.logoFilename
            })
          }

          queue('sendEmailQueue').add({
            message: 'welcome',
            name: team.name,
            email: team.email,
            token: teamEmailVerificationToken.token,
            teamId: team.id
          })

          callback(null)
          EventController.push(new CreateTeamEvent(team))
        })
        .catch(function (err) {
          if (TeamController.isTeamNameUniqueConstraintViolation(err)) {
            callback(new TeamCredentialsTakenError())
          } else if (TeamController.isTeamEmailUniqueConstraintViolation(err)) {
            callback(new TeamCredentialsTakenError())
          } else {
            logger.error(err)
            callback(new InternalError())
          }
        })
      }
    })
  }

  static signin (name, password, callback) {
    Team
      .query()
      .where('name', name)
      .first()
      .then(function (team) {
        if (team) {
          checkPassword(password, team.passwordHash, function (err, res) {
            if (err) {
              logger.error(err)
              callback(new InvalidTeamCredentialsError(), null)
            } else {
              if (res) {
                callback(null, team)
                EventController.push(new LoginTeamEvent(team))
              } else {
                callback(new InvalidTeamCredentialsError(), null)
              }
            }
          })
        } else {
          callback(new InvalidTeamCredentialsError(), null)
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static resendConfirmationEmail (id, callback) {
    TeamController.get(id, function (err, team) {
      if (err) {
        callback(err)
      } else {
        if (team.emailConfirmed) {
          callback(new EmailConfirmedError())
        } else {
          TeamEmailVerificationToken
            .query()
            .where('teamId', team.id)
            .andWhere('used', false)
            .andWhere('expiresAt', '>', new Date())
            .then(function (teamEmailVerificationTokens) {
              if (teamEmailVerificationTokens.length >= 2) {
                callback(new EmailVerificationAttemptsLimitError())
              } else {
                TeamEmailVerificationToken
                  .query()
                  .insert({
                    teamId: team.id,
                    token: token.generate(),
                    used: false,
                    createdAt: new Date(),
                    expiresAt: moment().add(1, 'h').toDate()
                  })
                  .then(function (teamEmailVerificationToken) {
                    queue('sendEmailQueue').add({
                      message: 'welcome',
                      name: team.name,
                      email: team.email,
                      token: teamEmailVerificationToken.token,
                      teamId: team.id
                    })

                    callback(null)
                  })
                  .catch(function (err) {
                    logger.error(err)
                    callback(new InternalError())
                  })
              }
            })
            .catch(function (err) {
              logger.error(err)
              callback(new InternalError())
            })
        }
      }
    })
  }

  static disqualify (id, callback) {
    TeamController.get(id, function (err, team) {
      if (err) {
        callback(err)
      } else {
        if (!team.isQualified()) {
          callback(new TeamNotQualifiedError())
        } else {
          let updatedTeam = null

          transaction(Team, TeamScore, function (Team, TeamScore) {
            return Team
              .query()
              .patchAndFetchById(team.id, {
                disqualified: true
              })
              .then(function (updatedTeamObject) {
                updatedTeam = updatedTeamObject
                return TeamScore
                  .query()
                  .delete()
                  .where('teamId', team.id)
                  .then(function () {
                  })
              })
          })
          .then(function () {
            EventController.push(new DisqualifyTeamEvent(updatedTeam), function (err, event) {
              if (err) {
                callback(err)
              } else {
                callback(null)
              }
            })
          })
          .catch(function (err) {
            logger.error(err)
            callback(err)
          })
        }
      }
    })
  }

  static updateEmail (id, email, callback) {
    TeamController.get(id, function (err, team) {
      if (err) {
        callback(err)
      } else {
        if (team.emailConfirmed) {
          callback(new EmailConfirmedError())
        } else {
          TeamEmailVerificationToken
            .query()
            .where('teamId', team.id)
            .andWhere('used', false)
            .andWhere('expiresAt', '>', new Date())
            .then(function (teamEmailVerificationTokens) {
              if (teamEmailVerificationTokens.length >= 2) {
                callback(new EmailVerificationAttemptsLimitError())
              } else {
                let updatedTeam = null
                let updatedTeamEmailVerificationToken = null

                transaction(Team, TeamEmailVerificationToken, function (Team, TeamEmailVerificationToken) {
                  return Team
                    .query()
                    .patchAndFetchById(id, {
                      email: email
                    })
                    .then(function (updatedTeamObject) {
                      updatedTeam = updatedTeamObject
                      return TeamEmailVerificationToken
                        .query()
                        .delete()
                        .where('teamId', team.id)
                        .andWhere('used', false)
                        .andWhere('expiresAt', '>', new Date())
                        .then(function (numDeleted) {
                          return TeamEmailVerificationToken
                            .query()
                            .insert({
                              teamId: team.id,
                              token: token.generate(),
                              used: false,
                              createdAt: new Date(),
                              expiresAt: moment().add(1, 'h').toDate()
                            })
                            .then(function (updatedTeamEmailVerificationTokenObject) {
                              updatedTeamEmailVerificationToken = updatedTeamEmailVerificationTokenObject
                            })
                        })
                    })
                })
                .then(function () {
                  queue('sendEmailQueue').add({
                    message: 'welcome',
                    name: updatedTeam.name,
                    email: updatedTeam.email,
                    token: updatedTeamEmailVerificationToken.token,
                    teamId: updatedTeam.id
                  })

                  callback(null)
                  EventController.push(new UpdateTeamEmailEvent(updatedTeam))
                })
                .catch(function (err) {
                  if (TeamController.isTeamEmailUniqueConstraintViolation(err)) {
                    callback(new EmailTakenError())
                  } else {
                    logger.error(err)
                    callback(new InternalError())
                  }
                })
              }
            })
            .catch(function (err) {
              logger.error(err)
              callback(new InternalError())
            })
        }
      }
    })
  }

  static updateProfile (id, countryId, locality, institution, callback) {
    TeamController.get(id, function (err, team) {
      if (err) {
        callback(err)
      } else {
        Team
          .query()
          .patchAndFetchById(team.id, {
            countryId: countryId,
            locality: locality,
            institution: institution
          })
          .then(function (updatedTeam) {
            callback(null)
            EventController.push(new UpdateTeamProfileEvent(updatedTeam))
          })
          .catch(function (err) {
            logger.error(err)
            callback(new InternalError())
          })
      }
    })
  }

  static updateLogo (id, logoFilename, callback) {
    TeamController.get(id, function (err, team) {
      if (err) {
        callback(err)
      } else {
        queue('createLogoQueue').add({
          id: team.id,
          filename: logoFilename
        })
        callback(null)
      }
    })
  }

  static updatePassword (id, currentPassword, newPassword, callback) {
    TeamController.get(id, function (err, team) {
      if (err) {
        callback(err)
      } else {
        checkPassword(currentPassword, team.passwordHash, function (err, res) {
          if (err) {
            logger.error(err)
            callback(new InternalError())
          } else {
            if (res) {
              getPasswordHash(newPassword, function (err, hash) {
                if (err) {
                  logger.error(err)
                  callback(new InternalError())
                } else {
                  Team
                    .query()
                    .patchAndFetchById(team.id, {
                      passwordHash: hash
                    })
                    .then(function (updatedTeam) {
                      callback(null)
                      EventController.push(new UpdateTeamPasswordEvent(updatedTeam))
                    })
                    .catch(function (err) {
                      logger.error(err)
                      callback(new InternalError())
                    })
                }
              })
            } else {
              callback(new InvalidTeamPasswordError())
            }
          }
        })
      }
    })
  }

  static index (callback, qualifiedOnly = false) {
    let query = Team.query()
    if (qualifiedOnly) {
      query = query
        .where('emailConfirmed', true)
        .andWhere('disqualified', false)
    }

    query
      .then(function (teams) {
        callback(null, teams)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static fetch (qualifiedOnly = false) {
    return new Promise(function (resolve, reject) {
      let query = Team.query()
      if (qualifiedOnly) {
        query = query
          .where('emailConfirmed', true)
          .andWhere('disqualified', false)
      }

      query
        .then(function (teams) {
          resolve(teams)
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  static resetPassword (encodedEmail, encodedToken, newPassword, callback) {
    let email = null
    let code = null
    try {
      email = token.decodeString(encodedEmail)
      code = token.decode(encodedToken)
      if (!code) {
        throw new Error('Reset password code is null')
      }
    } catch (e) {
      logger.error(e)
      callback(new InvalidResetPasswordURLError())
      return
    }

    Team
      .query()
      .where('email', email)
      .first()
      .then(function (team) {
        if (team) {
          TeamResetPasswordToken
            .query()
            .where('teamId', team.id)
            .andWhere('token', code)
            .andWhere('used', false)
            .andWhere('expiresAt', '>', new Date())
            .first()
            .then(function (teamResetPasswordToken) {
              if (teamResetPasswordToken) {
                getPasswordHash(newPassword, function (err, hash) {
                  if (err) {
                    logger.error(err)
                    callback(new InternalError())
                  } else {
                    transaction(Team, TeamResetPasswordToken, function (Team, TeamResetPasswordToken) {
                      return Team
                        .query()
                        .patchAndFetchById(team.id, {
                          passwordHash: hash
                        })
                        .then(function () {
                          return TeamResetPasswordToken
                            .query()
                            .patchAndFetchById(teamResetPasswordToken.id, {
                              used: true
                            })
                        })
                    })
                    .then(function () {
                      callback(null)
                    })
                    .catch(function (err) {
                      logger.error(err)
                      callback(new InternalError())
                    })
                  }
                })
              } else {
                callback(new InvalidResetPasswordURLError())
              }
            })
        } else {
          callback(new InvalidResetPasswordURLError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static verifyEmail (encodedEmail, encodedToken, callback) {
    let email = null
    let code = null
    try {
      email = token.decodeString(encodedEmail)
      code = token.decode(encodedToken)
    } catch (e) {
      logger.error(e)
      callback(new InvalidVerificationURLError())
      return
    }

    Team
      .query()
      .where('email', email)
      .first()
      .then(function (team) {
        if (team) {
          if (team.emailConfirmed) {
            callback(new EmailConfirmedError())
          } else {
            TeamEmailVerificationToken
              .query()
              .where('teamId', team.id)
              .andWhere('token', code)
              .andWhere('used', false)
              .andWhere('expiresAt', '>', new Date())
              .first()
              .then(function (teamEmailVerificationToken) {
                if (teamEmailVerificationToken) {
                  let updatedTeam = null

                  transaction(Team, TeamEmailVerificationToken, function (Team, TeamEmailVerificationToken) {
                    return Team
                      .query()
                      .patchAndFetchById(team.id, {
                        emailConfirmed: true
                      })
                      .then(function (updatedTeamObject) {
                        updatedTeam = updatedTeamObject
                        return TeamEmailVerificationToken
                          .query()
                          .patchAndFetchById(teamEmailVerificationToken.id, {
                            used: true
                          })
                      })
                  })
                  .then(function () {
                    callback(null)
                    EventController.push(new QualifyTeamEvent(updatedTeam))
                  })
                  .catch(function (err) {
                    logger.error(err)
                    callback(new InternalError())
                  })
                } else {
                  callback(new InvalidVerificationURLError())
                }
              })
              .catch(function (err) {
                logger.error(err)
                callback(new InternalError())
              })
          }
        } else {
          callback(new InvalidVerificationURLError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static fetchOne (id) {
    return new Promise(function (resolve, reject) {
      Team
        .query()
        .where('id', id)
        .first()
        .then(function (team) {
          if (team) {
            resolve(team)
          } else {
            reject(new TeamNotFoundError())
          }
        })
        .catch(function (err) {
          logger.error(err)
          reject(new InternalError())
        })
    })
  }

  static get (id, callback) {
    Team
      .query()
      .where('id', id)
      .first()
      .then(function (team) {
        if (team) {
          callback(null, team)
        } else {
          callback(new TeamNotFoundError(), null)
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

module.exports = TeamController
