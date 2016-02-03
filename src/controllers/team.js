import Team from '../models/team'
import { getPasswordHash, checkPassword } from '../utils/security'
import fs from 'fs'
import path from 'path'
import gm from 'gm'
import queue from '../utils/queue'
import token from '../utils/token'
import logger from '../utils/logger'
import { InternalError, TeamNotFoundError, TeamCredentialsTakenError, InvalidTeamCredentialsError, EmailConfirmedError, EmailTakenError, InvalidTeamPasswordError, InvalidResetPasswordURLError, InvalidVerificationURLError } from '../utils/errors'
import publish from '../utils/publisher'
import BaseEvent from '../utils/events'

import teamSerializer from '../serializers/team'


class UpdateTeamProfileEvent extends BaseEvent {
  constructor(team) {
    super('updateTeamProfile')
    let publicData = teamSerializer(team)
    this.data.guests = publicData
    this.data.teams = publicData

    this.data.supervisors = teamSerializer(team, { exposeEmail: true })
  }
}


class QualifyTeamEvent extends BaseEvent {
  constructor(team) {
    super('qualifyTeam')
    let publicData = teamSerializer(team)
    this.data.guests = publicData
    this.data.teams = publicData

    this.data.supervisors = teamSerializer(team, { exposeEmail: true })
  }
}


class CreateTeamEvent extends BaseEvent {
  constructor(team) {
    super('createTeam')
    this.data.supervisors = teamSerializer(team, { exposeEmail: true })
  }
}


class ChangeTeamEmailEvent extends BaseEvent {
  constructor(team) {
    super('changeTeamEmail')
    this.data.supervisors = teamSerializer(team, { exposeEmail: true })
  }
}


class TeamController {
  static restore(email, callback) {
    Team
      .query()
      .where('email', email.toLowerCase())
      .first()
      .then((team) => {
        Team
          .query()
          .patchAndFetchById(team.id, {
            resetPasswordToken: token.generate()
          })
          .then((updatedTeam) => {
            query('sendEmailQueue').add({
              message: 'restore',
              name: updatedTeam.name,
              email: updatedTeam.email,
              token: updatedTeam.resetPasswordToken
            })
            callback(null)
          })
          .catch((err) => {
            logger.error(err)
            callback(new InternalError())
          })
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static create(options, callback) {
    Team
      .query()
      .where('name', options.team)
      .orWhere('email', options.email.toLowerCase())
      .first()
      .then((team) => {
        if (team) {
          callback(new TeamCredentialsTakenError())
        } else {
          getPasswordHash(options.password, (err, hash) => {
            if (err) {
              logger.error(err)
              callback(new InternalError())
            } else {
              Team
                .query()
                .insert({
                  name: options.team,
                  email: options.email,
                  createdAt: new Date(),
                  emailConfirmed: false,
                  emailConfirmationToken: token.generate(),
                  passwordHash: hash,
                  country: options.country,
                  locality: options.locality,
                  institution: options.institution,
                  disqualified: false,
                  resetPasswordToken: null
                })
                .then((team) => {
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
                    token: team.emailConfirmationToken
                  })

                  callback(null)
                  publish('realtime', new CreateTeamEvent(team))
                })
                .catch((err) => {
                  logger.error(err)
                  callback(new InternalError())
                })
            }
          })
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static signin(name, password, callback) {
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

  static resendConfirmationEmail(id, callback) {
    TeamController.get(id, (err, team) => {
      if (err) {
        callback(err)
      } else {
        if (team.emailConfirmed) {
          callback(new EmailConfirmedError())
        } else {
          Team
            .query()
            .patchAndFetchById(team.id, {
              emailConfirmationToken: token.generate()
            })
            .then((updatedTeam) => {
              queue('sendEmailQueue').add({
                message: 'welcome',
                name: updatedTeam.name,
                email: updatedTeam.email,
                token: updatedTeam.emailConfirmationToken
              })

              callback(null)
            })
            .catch((err) => {
              logger.error(err)
              callback(new InternalError())
            })
        }
      }
    })
  }

  static changeEmail(id, email, callback) {
    TeamController.get(id, (err, team) => {
      if (err) {
        callback(err)
      } else {
        if (team.emailConfirmed) {
          callback(new EmailConfirmedError())
        } else {
          Team
            .query()
            .where('email', email.toLowerCase())
            .first()
            .then((duplicateTeam) => {
              if (duplicateTeam) {
                callback(new EmailTakenError())
              } else {
                Team
                  .query()
                  .patchAndFetchById(team.id, {
                    email: email,
                    emailConfirmationToken: token.generate()
                  })
                  .then((updatedTeam) => {
                    queue('sendEmailQueue').add({
                      message: 'welcome',
                      name: updatedTeam.name,
                      email: updatedTeam.email,
                      token: updatedTeam.emailConfirmationToken
                    })

                    callback(null)
                    publish('realtime', new ChangeTeamEmailEvent(updatedTeam))
                  })
                  .catch((err) => {
                    logger.error(err)
                    callback(err)
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

  static editProfile(id, country, locality, institution, callback) {
    TeamController.get(id, (err, team) => {
      if (err) {
        callback(err)
      } else {
        Team
          .query()
          .patchAndFetchById(team.id, {
            country: country,
            locality: locality,
            institution: institution
          })
          .then((updatedTeam) => {
            callback(null)
            publish('realtime', new UpdateTeamProfileEvent(updatedTeam))
          })
          .catch((err) => {
            logger.error(err)
            callback(new InternalError())
          })
      }
    })
  }

  static changeLogo(id, logoFilename, callback) {
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

  static changePassword(id, currentPassword, newPassword, callback) {
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

  static list(callback) {
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

  static listQualified(callback) {
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

  static resetPassword(encodedEmail, encodedToken, newPassword, callback) {
    let email = null
    let code = null
    try {
      email = token.decodeString(encodedEmail)
      code = token.decode(encodedToken)
      if (!code) {
        throw 'Reset password code is null'
      }
    } catch (e) {
      logger.error(e)
      callback(new InvalidResetPasswordURLError())
      return
    }

    Team
      .query()
      .where('email', email)
      .andWhere('resetPasswordToken', code)
      .first()
      .then((team) => {
        if (team) {
          getPasswordHash(newPassword, (err, hash) => {
            if (err) {
              logger.error(err)
              callback(new InternalError())
            } else {
              Team
                .query()
                .patchAndFetchById(team.id, {
                  passwordHash: hash,
                  resetPasswordToken: null
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
          callback(new InvalidResetPasswordURLError())
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError())
      })
  }

  static verifyEmail(encodedEmail, encodedToken, callback) {
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
      .andWhere('emailConfirmed', false)
      .andWhere('emailConfirmationToken', code)
      .first()
      .then((team) => {
        if (team) {
          Team
            .query()
            .patchAndFetchById(team.id, {
              emailConfirmed: true,
              emailConfirmationToken: null
            })
            .then((updatedTeam) => {
              callback(null)
              publish('realtime', new QualifyTeamEvent(updatedTeam))
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

  static get(id, callback) {
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
