const Team = require('../models/team')
const TeamResetPasswordToken = require('../models/team-reset-password-token')
const TeamEmailVerificationToken = require('../models/team-email-verification-token')
const TeamRanking = require('../models/team-ranking')
const { getPasswordHash, checkPassword } = require('../utils/security')
const queue = require('../utils/queue')
const token = require('../utils/token')
const logger = require('../utils/logger')
const { InternalError, TeamNotFoundError, TeamCredentialsTakenError, InvalidTeamCredentialsError, EmailConfirmedError,
  EmailTakenError, InvalidTeamPasswordError, InvalidResetPasswordURLError, InvalidVerificationURLError,
  ResetPasswordAttemptsLimitError, EmailVerificationAttemptsLimitError, TeamNotQualifiedError, CTFtimeProfileAlreadyLinkedError } = require('../utils/errors')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION } = require('../utils/constants')
const moment = require('moment')
const { transaction } = require('objection')

const EventController = require('./event')
const CreateTeamEvent = require('../events/create-team')
const UpdateTeamEmailEvent = require('../events/update-team-email')
const UpdateTeamLogoEvent = require('../events/update-team-logo')

const UpdateTeamProfileEvent = require('../events/update-team-profile')
const QualifyTeamEvent = require('../events/qualify-team')
const LoginTeamEvent = require('../events/login-team')
const UpdateTeamPasswordEvent = require('../events/update-team-password')
const DisqualifyTeamEvent = require('../events/disqualify-team')

class TeamController {
  static getBaseLink () {
    return `http${process.env.VOLGACTF_QUALIFIER_SECURE === 'yes' ? 's' : ''}://${process.env.VOLGACTF_QUALIFIER_FQDN}`
  }

  static getEmailConfirmLink (email, code) {
    const u = new URL(`${TeamController.getBaseLink()}/team/verify-email`)
    u.searchParams.append('team', token.encode(email))
    u.searchParams.append('code', token.encode(code))
    return u.toString()
  }

  static getPasswordResetLink (email, code) {
    const u = new URL(`${TeamController.getBaseLink()}/team/reset-password`)
    u.searchParams.append('team', token.encode(email))
    u.searchParams.append('code', token.encode(code))
    return u.toString()
  }

  static restore (email, callback) {
    Team
      .query()
      .where('email', email)
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
                    expiresAt: moment().add(2, 'h').toDate()
                  })
                  .then(function (teamResetPasswordToken) {
                    queue('sendEmailQueue').add({
                      message: 'restore',
                      name: team.name,
                      email: team.email,
                      password_reset_link: TeamController.getPasswordResetLink(team.email, teamResetPasswordToken.token),
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

  static isTeamCtftimeTeamIdUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'teams_ctftime_team_id_uniq')
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
              disqualified: false,
              ctftimeTeamId: null,
              logoChecksum: null
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
                  expiresAt: moment().add(2, 'h').toDate()
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
            email_confirm_link: TeamController.getEmailConfirmLink(team.email, teamEmailVerificationToken.token),
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

  static createFromCTFtime (options, ctftime) {
    return new Promise(function (resolve, reject) {
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
            passwordHash: '',
            countryId: options.countryId,
            locality: options.locality,
            institution: '',
            disqualified: false,
            ctftimeTeamId: options.ctftimeTeamId,
            logoChecksum: null
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
                expiresAt: moment().add(2, 'h').toDate()
              })
              .then(function (newTeamEmailVerificationToken) {
                teamEmailVerificationToken = newTeamEmailVerificationToken
              })
          })
      })
      .then(function () {
        queue('sendEmailQueue').add({
          message: 'welcome',
          name: team.name,
          email: team.email,
          email_confirm_link: TeamController.getEmailConfirmLink(team.email, teamEmailVerificationToken.token),
          teamId: team.id
        })

        resolve(team)
        EventController.push(new CreateTeamEvent(team, ctftime))
      })
      .catch(function (err) {
        if (TeamController.isTeamNameUniqueConstraintViolation(err)) {
          reject(new TeamCredentialsTakenError())
        } else if (TeamController.isTeamEmailUniqueConstraintViolation(err)) {
          reject(new TeamCredentialsTakenError())
        } else if (TeamController.isTeamCtftimeTeamIdUniqueConstraintViolation(err)) {
          reject(new CTFtimeProfileAlreadyLinkedError())
        } else {
          logger.error(err)
          reject(new InternalError())
        }
      })
    })
  }

  static updateFromCTFtime (id, ctftimeTeamId) {
    return new Promise(function(resolve, reject) {
      TeamController.get(id, function (err, team) {
        if (err) {
          reject(err)
        } else {
          if (team.ctftimeTeamId) {
            reject(new InternalError())
          } else {
            Team
            .query()
            .patchAndFetchById(team.id, {
              ctftimeTeamId: ctftimeTeamId
            })
            .then(function (updatedTeam) {
              resolve(updatedTeam)
            })
            .catch(function (err) {
              if (TeamController.isTeamCtftimeTeamIdUniqueConstraintViolation(err)) {
                reject(new CTFtimeProfileAlreadyLinkedError())
              } else {
                logger.error(err)
                reject(new InternalError())
              }
            })
          }
        }
      })
    })
  }

  static signin (opts) {
    return new Promise(function (resolve, reject) {
      Team
      .query()
      .where('name', opts.name)
      .first()
      .then(function (team) {
        if (team) {
          checkPassword(opts.password, team.passwordHash, function (err, res) {
            if (err) {
              logger.error(err)
              reject(new InvalidTeamCredentialsError())
            } else {
              if (res) {
                EventController.push(new LoginTeamEvent(team, opts.countryName, opts.cityName, null))
                resolve(team)
              } else {
                reject(new InvalidTeamCredentialsError())
              }
            }
          })
        } else {
          reject(new InvalidTeamCredentialsError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
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
                    expiresAt: moment().add(2, 'd').toDate()
                  })
                  .then(function (teamEmailVerificationToken) {
                    queue('sendEmailQueue').add({
                      message: 'welcome',
                      name: team.name,
                      email: team.email,
                      email_confirm_link: TeamController.getEmailConfirmLink(team.email, teamEmailVerificationToken.token),
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

          transaction(Team, TeamRanking, function (Team, TeamRanking) {
            return Team
              .query()
              .patchAndFetchById(team.id, {
                disqualified: true
              })
              .then(function (updatedTeamObject) {
                updatedTeam = updatedTeamObject
                return TeamRanking
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

  static updateEmail2 (id, email) {
    return new Promise(function (resolve, reject) {
      TeamController.updateEmail(id, email, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
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
                              expiresAt: moment().add(2, 'd').toDate()
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
                    email_confirm_link: TeamController.getEmailConfirmLink(updatedTeam.email, updatedTeamEmailVerificationToken.token),
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

  static updateLogoChecksum (id, checksum) {
    return new Promise(function (resolve, reject) {
      TeamController
      .fetchOne(id)
      .then(function (team) {
        return Team
          .query()
          .patchAndFetchById(team.id, {
            logoChecksum: checksum
          })
      })
      .then(function (updatedTeam) {
        EventController.push(new UpdateTeamLogoEvent(updatedTeam))
        resolve(updatedTeam)
      })
      .catch(function (err2) {
        reject(err2)
      })
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

  static createPassword (id, newPassword, callback) {
    TeamController.get(id, function (err, team) {
      if (err) {
        callback(err)
      } else {
        if (team.passwordHash === '') {
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
          callback(new InternalError())
        }
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

  static fetchByCTFtimeTeamId (ctftimeTeamId) {
    return new Promise(function (resolve, reject) {
      Team
        .query()
        .where('ctftimeTeamId', ctftimeTeamId)
        .first()
        .then(function (team) {
          resolve(team)
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
