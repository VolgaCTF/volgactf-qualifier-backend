import Team from '../models/team'
import security from '../utils/security'
import fs from 'fs'
import path from 'path'
import gm from 'gm'
import queue from '../utils/queue'
import token from '../utils/token'
import logger from '../utils/logger'
import errors from '../utils/errors'
import publisher from '../utils/publisher'
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
    Team.findOne({ email: email.toLowerCase() }, (err, team) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError())
      } else {
        if (team) {
          team.resetPasswordToken = token.generate()
          team.save((err, team) => {
            if (err) {
              logger.error(err)
              callback(new errors.InternalError())
            } else {
              queue('sendEmailQueue').add({
                message: 'restore',
                name: team.name,
                email: team.email,
                token: team.resetPasswordToken
              })

              callback(null)
            }
          })
        } else {
          callback(new errors.TeamNotFoundError())
        }
      }
    })
  }

  static create(options, callback) {
    Team.find().or([ { name: options.team }, { email: options.email.toLowerCase() } ]).count((err, count) => {
      if (err) {
        logger.error(err)
        callback(err)
      } else {
        if (count > 0) {
          callback(new errors.TeamCredentialsTakenError())
        } else {
          security.getPasswordHash(options.password, (err, hash) => {
            if (err) {
              logger.error(err)
              callback(new errors.InternalError())
            } else {
              let team = new Team({
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

              team.save((err, team) => {
                if (err) {
                  logger.error(err)
                  callback(new errors.InternalError())
                } else {
                  if (options.logoFilename) {
                    queue('createLogoQueue').add({
                      id: team._id,
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
                  publisher.publish('realtime', new CreateTeamEvent(team))
                }
              })
            }
          })
        }
      }
    })
  }

  static signin(name, password, callback) {
    Team.findOne({ name: name }, (err, team) => {
      if (err) {
        logger.error(err)
        callback(new errors.InvalidTeamCredentialsError(), null)
      } else {
        if (team) {
          security.checkPassword(password, team.passwordHash, (err, res) => {
            if (err) {
              logger.error(err)
              callback(new errors.InternalError(), null)
            } else {
              if (res) {
                callback(null, team)
              } else {
                callback(new errors.InvalidTeamCredentialsError(), null)
              }
            }
          })
        } else {
          callback(new errors.InvalidTeamCredentialsError(), null)
        }
      }
    })
  }

  static resendConfirmationEmail(id, callback) {
    TeamController.get(id, (err, team) => {
      if (err) {
        callback(err)
      } else {
        if (team.emailConfirmed) {
          callback(new errors.EmailConfirmedError())
        } else {
          team.emailConfirmationToken = token.generate()
          team.save((err, team) => {
            if (err) {
              logger.error(err)
              callback(new errors.InternalError())
            } else {
              queue('sendEmailQueue').add({
                message: 'welcome',
                name: team.name,
                email: team.email,
                token: team.emailConfirmationToken
              })

              callback(null)
            }
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
          callback(new errors.EmailConfirmedError())
        } else {
          Team.find({ email: email.toLowerCase() }).count((err, count) => {
            if (err) {
              logger.error(err)
              callback(new errors.InternalError())
            } else {
              if (count > 0) {
                callback(new errors.EmailTakenError())
              } else {
                team.email = email
                team.emailConfirmationToken = token.generate()
                team.save((err, team) => {
                  if (err) {
                    logger.error(err)
                    callback(new errors.InternalError())
                  } else {
                    queue('sendEmailQueue').add({
                      message: 'welcome',
                      name: team.name,
                      email: team.email,
                      token: team.emailConfirmationToken
                    })

                    callback(null)
                    publisher.publish('realtime', new ChangeTeamEmailEvent(team))
                  }
                })
              }
            }
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
        team.country = country
        team.locality = locality
        team.institution = institution
        team.save((err, team) => {
          if (err) {
            logger.error(err)
            callback(new errors.InternalError())
          } else {
            callback(null)
            publisher.publish('realtime', new UpdateTeamProfileEvent(team))
          }
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
          id: team._id,
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
        security.checkPassword(currentPassword, team.passwordHash, (err, res) => {
          if (err) {
            logger.error(err)
            callback(new errors.InternalError())
          } else {
            if (res) {
              security.getPasswordHash(newPassword, (err, hash) => {
                if (err) {
                  logger.error(err)
                  callback(new errors.InternalError())
                } else {
                  team.passwordHash = hash
                  team.save((err, team) => {
                    if (err) {
                      logger.error(err)
                      callback(new errors.InternalError())
                    } else {
                      callback(null)
                    }
                  })
                }
              })
            } else {
              callback(new errors.InvalidTeamPasswordError())
            }
          }
        })
      }
    })
  }

  static list(callback) {
    Team.find((err, teams) => {
      if (err) {
        callback(err, null)
      } else {
        callback(null, teams)
      }
    })
  }

  static listQualified(callback) {
    Team.find({ emailConfirmed: true }, (err, teams) => {
      if (err) {
        logger.error(err)
        callback(new errors.InternalError(), null)
      } else {
        callback(null, teams)
      }
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
      callback(new errors.InvalidResetPasswordURLError())
      return
    }

    let params = {
      email: email,
      resetPasswordToken: code
    }
    Team.findOne(params, (err, team) => {
      if (team) {
        security.getPasswordHash(newPassword, (err, hash) => {
          if (err) {
            logger.error(err)
            callback(new errors.InternalError())
          } else {
            team.passwordHash = hash
            team.resetPasswordToken = null
            team.save((err, team) => {
              if (err) {
                logger.error(err)
                callback(new errors.InternalError())
              } else {
                callback(null)
              }
            })
          }
        })
      } else {
        callback(new errors.InvalidResetPasswordURLError())
      }
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
      callback(new errors.InvalidVerificationURLError())
      return
    }

    let params = {
      email: email,
      emailConfirmationToken: code
    }

    Team.findOne(params, (err, team) => {
      if (team) {
        team.emailConfirmed = true
        team.emailConfirmationToken = null
        team.save((err, team) => {
          if (err) {
            logger.error(err)
            callback(new errors.InternalError())
          } else {
            callback(null)
            publisher.publish('realtime', new QualifyTeamEvent(team))
          }
        })
      } else {
        callback(new errors.InvalidVerificationURLError())
      }
    })
  }

  static get(id, callback) {
    Team.findOne({ _id: id }, (err, team) => {
      if (err) {
        callback(new errors.TeamNotFoundError(), null)
      } else {
        if (team) {
          callback(null, team)
        } else {
          callback(new errors.TeamNotFoundError(), null)
        }
      }
    })
  }
}


export default TeamController
