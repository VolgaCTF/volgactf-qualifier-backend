import Team from '../models/team'
import TeamResetPasswordToken from '../models/team-reset-password-token'
import TeamEmailVerificationToken from '../models/team-email-verification-token'
import { getPasswordHash, checkPassword } from '../utils/security'
import queue from '../utils/queue'
import token from '../utils/token'
import logger from '../utils/logger'
import { InternalError, TeamNotFoundError, TeamCredentialsTakenError, InvalidTeamCredentialsError, EmailConfirmedError, EmailTakenError, InvalidTeamPasswordError, InvalidResetPasswordURLError, InvalidVerificationURLError, ResetPasswordAttemptsLimitError, EmailVerificationAttemptsLimitError } from '../utils/errors'
import constants from '../utils/constants'
import moment from 'moment'
import { transaction } from 'objection'

import EventController from './event'
import CreateTeamEvent from '../events/create-team'
import UpdateTeamEmailEvent from '../events/update-team-email'
import UpdateTeamProfileEvent from '../events/update-team-profile'
import QualifyTeamEvent from '../events/qualify-team'

class TeamController {
  static restore (email, callback) {
    Team
      .query()
      .where('email', email.toLowerCase())
      .first()
      .then((team) => {
        if (team) {
          TeamResetPasswordToken
            .query()
            .where('teamId', team.id)
            .andWhere('used', false)
            .andWhere('expiresAt', '>', new Date())
            .then((teamResetPasswordTokens) => {
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
                  .then((teamResetPasswordToken) => {
                    queue('sendEmailQueue').add({
                      message: 'restore',
                      name: team.name,
                      email: team.email,
                      token: teamResetPasswordToken.token
                    })
                    callback(null)
                  })
                  .catch((err) => {
                    logger.error(err)
                    callback(new InternalError())
                  })
              }
            })
            .catch((err) => {
              logger.error(err)
              callback(new InternalError())
            })
        } else {
          callback(new TeamNotFoundError())
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static isTeamNameUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'teams_ndx_name_unique')
  }

  static isTeamEmailUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'teams_ndx_email_unique')
  }

  static create (options, callback) {
    getPasswordHash(options.password, (err, hash) => {
      if (err) {
        logger.error(err)
        callback(new InternalError())
      } else {
        let team = null
        let teamEmailVerificationToken = null

        transaction(Team, TeamEmailVerificationToken, (Team, TeamEmailVerificationToken) => {
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
              institution: options.institution,
              disqualified: false
            })
            .then((newTeam) => {
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
                .then((newTeamEmailVerificationToken) => {
                  teamEmailVerificationToken = newTeamEmailVerificationToken
                })
            })
        })
        .then(() => {
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
            token: teamEmailVerificationToken.token
          })

          callback(null)
          EventController.push(new CreateTeamEvent(team))
        })
        .catch((err) => {
          if (this.isTeamNameUniqueConstraintViolation(err)) {
            callback(new TeamCredentialsTakenError())
          } else if (this.isTeamEmailUniqueConstraintViolation(err)) {
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
      .then((team) => {
        if (team) {
          checkPassword(password, team.passwordHash, (err, res) => {
            if (err) {
              logger.error(err)
              callback(new InvalidTeamCredentialsError(), null)
            } else {
              if (res) {
                callback(null, team)
              } else {
                callback(new InvalidTeamCredentialsError(), null)
              }
            }
          })
        } else {
          callback(new InvalidTeamCredentialsError(), null)
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static resendConfirmationEmail (id, callback) {
    TeamController.get(id, (err, team) => {
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
            .then((teamEmailVerificationTokens) => {
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
                  .then((teamEmailVerificationToken) => {
                    queue('sendEmailQueue').add({
                      message: 'welcome',
                      name: team.name,
                      email: team.email,
                      token: teamEmailVerificationToken.token
                    })

                    callback(null)
                  })
                  .catch((err) => {
                    logger.error(err)
                    callback(new InternalError())
                  })
              }
            })
            .catch((err) => {
              logger.error(err)
              callback(new InternalError())
            })
        }
      }
    })
  }

  static changeEmail (id, email, callback) {
    TeamController.get(id, (err, team) => {
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
            .then((teamEmailVerificationTokens) => {
              if (teamEmailVerificationTokens.length >= 2) {
                callback(new EmailVerificationAttemptsLimitError())
              } else {
                let updatedTeam = null
                let updatedTeamEmailVerificationToken = null

                transaction(Team, TeamEmailVerificationToken, (Team, TeamEmailVerificationToken) => {
                  return Team
                    .query()
                    .patchAndFetchById(id, {
                      email: email
                    })
                    .then((updatedTeamObject) => {
                      updatedTeam = updatedTeamObject
                      return TeamEmailVerificationToken
                        .query()
                        .delete()
                        .where('teamId', team.id)
                        .andWhere('used', false)
                        .andWhere('expiresAt', '>', new Date())
                        .then((numDeleted) => {
                          return TeamEmailVerificationToken
                            .query()
                            .insert({
                              teamId: team.id,
                              token: token.generate(),
                              used: false,
                              createdAt: new Date(),
                              expiresAt: moment().add(1, 'h').toDate()
                            })
                            .then((updatedTeamEmailVerificationTokenObject) => {
                              updatedTeamEmailVerificationToken = updatedTeamEmailVerificationTokenObject
                            })
                        })
                    })
                })
                .then(() => {
                  queue('sendEmailQueue').add({
                    message: 'welcome',
                    name: updatedTeam.name,
                    email: updatedTeam.email,
                    token: updatedTeamEmailVerificationToken.token
                  })

                  callback(null)
                  EventController.push(new UpdateTeamEmailEvent(updatedTeam))
                })
                .catch((err) => {
                  if (this.isTeamEmailUniqueConstraintViolation(err)) {
                    callback(new EmailTakenError())
                  } else {
                    logger.error(err)
                    callback(new InternalError())
                  }
                })
              }
            })
            .catch((err) => {
              logger.error(err)
              callback(new InternalError())
            })
        }
      }
    })
  }

  static editProfile (id, countryId, locality, institution, callback) {
    TeamController.get(id, (err, team) => {
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
          .then((updatedTeam) => {
            callback(null)
            EventController.push(new UpdateTeamProfileEvent(updatedTeam))
          })
          .catch((err) => {
            logger.error(err)
            callback(new InternalError())
          })
      }
    })
  }

  static changeLogo (id, logoFilename, callback) {
    TeamController.get(id, (err, team) => {
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

  static changePassword (id, currentPassword, newPassword, callback) {
    TeamController.get(id, (err, team) => {
      if (err) {
        callback(err)
      } else {
        checkPassword(currentPassword, team.passwordHash, (err, res) => {
          if (err) {
            logger.error(err)
            callback(new InternalError())
          } else {
            if (res) {
              getPasswordHash(newPassword, (err, hash) => {
                if (err) {
                  logger.error(err)
                  callback(new InternalError())
                } else {
                  Team
                    .query()
                    .patchAndFetchById(team.id, {
                      passwordHash: hash
                    })
                    .then((updatedTeam) => {
                      callback(null)
                    })
                    .catch((err) => {
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

  static list (callback) {
    Team
      .query()
      .then((teams) => {
        callback(null, teams)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static listQualified (callback) {
    Team
      .query()
      .where('emailConfirmed', true)
      .then((teams) => {
        callback(null, teams)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
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
      .then((team) => {
        if (team) {
          TeamResetPasswordToken
            .query()
            .where('teamId', team.id)
            .andWhere('token', code)
            .andWhere('used', false)
            .andWhere('expiresAt', '>', new Date())
            .first()
            .then((teamResetPasswordToken) => {
              if (teamResetPasswordToken) {
                getPasswordHash(newPassword, (err, hash) => {
                  if (err) {
                    logger.error(err)
                    callback(new InternalError())
                  } else {
                    transaction(Team, TeamResetPasswordToken, (Team, TeamResetPasswordToken) => {
                      return Team
                        .query()
                        .patchAndFetchById(team.id, {
                          passwordHash: hash
                        })
                        .then(() => {
                          return TeamResetPasswordToken
                            .query()
                            .patchAndFetchById(teamResetPasswordToken.id, {
                              used: true
                            })
                        })
                    })
                    .then(() => {
                      callback(null)
                    })
                    .catch((err) => {
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
      .catch((err) => {
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
      .then((team) => {
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
              .then((teamEmailVerificationToken) => {
                if (teamEmailVerificationToken) {
                  let updatedTeam = null

                  transaction(Team, TeamEmailVerificationToken, (Team, TeamEmailVerificationToken) => {
                    return Team
                      .query()
                      .patchAndFetchById(team.id, {
                        emailConfirmed: true
                      })
                      .then((updatedTeamObject) => {
                        updatedTeam = updatedTeamObject
                        return TeamEmailVerificationToken
                          .query()
                          .patchAndFetchById(teamEmailVerificationToken.id, {
                            used: true
                          })
                      })
                  })
                  .then(() => {
                    callback(null)
                    EventController.push(new QualifyTeamEvent(updatedTeam))
                  })
                  .catch((err) => {
                    logger.error(err)
                    callback(new InternalError())
                  })
                } else {
                  callback(new InvalidVerificationURLError())
                }
              })
              .catch((err) => {
                logger.error(err)
                callback(new InternalError())
              })
          }
        } else {
          callback(new InvalidVerificationURLError())
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static get (id, callback) {
    Team
      .query()
      .where('id', id)
      .first()
      .then((team) => {
        if (team) {
          callback(null, team)
        } else {
          callback(new TeamNotFoundError(), null)
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }
}

export default TeamController
