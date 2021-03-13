const SupervisorInvitation = require('../models/supervisor-invitation')
const { InternalError, SupervisorInvitationLimitError, InvalidCreateSupervisorURLError } = require('../utils/errors')
const logger = require('../utils/logger')
const queue = require('../utils/queue')
const token = require('../utils/token')
const moment = require('moment')

class SupervisorInvitationController {
  getBaseLink () {
    return `http${process.env.VOLGACTF_QUALIFIER_SECURE === 'yes' ? 's' : ''}://${process.env.VOLGACTF_QUALIFIER_FQDN}`
  }

  getCreateAccountLink (code) {
    const u = new URL(`${this.getBaseLink()}/supervisor/create`)
    u.searchParams.append('code', token.encode(code))
    return u.toString()
  }

  create (email, rights) {
    const that = this
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
        queue('sendEmailQueue').add({
          message: 'invite_supervisor',
          create_account_link: that.getCreateAccountLink(supervisorInvitation.token),
          email: supervisorInvitation.email,
          rights: supervisorInvitation.rights
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
