const SupervisorInvitation = require('../models/supervisor-invitation')
const { InternalError, SupervisorInvitationLimitError, InvalidCreateSupervisorURLError } = require('../utils/errors')
const logger = require('../utils/logger')
const queue = require('../utils/queue')
const token = require('../utils/token')
const moment = require('moment')

class SupervisorInvitationController {
  create (email, rights) {
    return new Promise(function (resolve, reject) {
      SupervisorInvitation
      .query()
      .where('email', email.toLowerCase())
      .andWhere('used', false)
      .andWhere('expires', '>', new Date())
      .then(function (activeSupervisorInvitations) {
        if (activeSupervisorInvitations.length >= 2) {
          reject(new SupervisorInvitationLimitError())
        } else {
          return SupervisorInvitation
          .query()
          .insert({
            email: email.toLowerCase(),
            rights: rights,
            token: token.generate(),
            used: false,
            created: new Date(),
            expires: moment().add(4, 'h').toDate()
          })
        }
      })
      .then(function (supervisorInvitation) {
        logger.info(supervisorInvitation)
        queue('sendEmailQueue').add({
          message: 'invite_supervisor',
          name: '',
          email: supervisorInvitation.email,
          rights: supervisorInvitation.rights,
          token: supervisorInvitation.token
        })
        resolve(supervisorInvitation)
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
    })
  }

  find (code) {
    return new Promise(function (resolve, reject) {
      let decodedToken = null
      try {
        decodedToken = token.decode(code)
        if (!decodedToken) {
          reject(new InvalidCreateSupervisorURLError())
          return
        }
      } catch (e) {
        logger.error(e)
        reject(new InvalidCreateSupervisorURLError())
        return
      }

      SupervisorInvitation
      .query()
      .where('token', decodedToken)
      .andWhere('used', false)
      .andWhere('expires', '>', new Date())
      .first()
      .then(function (supervisorInvitation) {
        if (supervisorInvitation) {
          resolve(supervisorInvitation)
        } else {
          reject(new InvalidCreateSupervisorURLError())
        }
      })
      .catch(function (err) {
        logger.error(err)
        reject(new InternalError())
      })
    })
  }
}

module.exports = new SupervisorInvitationController()
