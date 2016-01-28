import mustache from 'mustache'
import fs from 'fs'
import path from 'path'


class EmailController {
  static generateWelcomeEmail(params) {
    let plainTemplateName = path.join(__dirname, '..', '..', 'templates', 'welcome.plain.mustache')
    let plainTemplate = fs.readFileSync(plainTemplateName, 'utf8')
    let plainMessage = mustache.render(plainTemplate, params)

    let htmlTemplateName = path.join(__dirname, '..', '..', 'templates', 'welcome.html.mustache')
    let htmlTemplate = fs.readFileSync(htmlTemplateName, 'utf8')
    let htmlMessage = mustache.render(htmlTemplate, params)

    return {
      subject: 'Welcome to VolgaCTF 2015 Quals!',
      plain: plainMessage,
      html: htmlMessage
    }
  }

  static generateRestoreEmail(params) {
    let plainTemplateName = path.join(__dirname, '..', '..', 'templates', 'restore.plain.mustache')
    let plainTemplate = fs.readFileSync(plainTemplateName, 'utf8')
    let plainMessage = mustache.render(plainTemplate, params)

    let htmlTemplateName = path.join(__dirname, '..', '..', 'templates', 'restore.html.mustache')
    let htmlTemplate = fs.readFileSync(htmlTemplateName, 'utf8')
    let htmlMessage = mustache.render(htmlTemplate, params)

    return {
      subject: 'Reset your password at VolgaCTF 2015 Quals website!',
      plain: plainMessage,
      html: htmlMessage
    }
  }
}


export default EmailController
