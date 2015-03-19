mustache = require 'mustache'
fs = require 'fs'
path = require 'path'


class EmailController
    @generateWelcomeEmail: (params) ->
        plainTemplateName = path.join __dirname, '..', '..', 'templates', 'welcome.plain.mustache'
        plainTemplate = fs.readFileSync plainTemplateName, 'utf8'
        plainMessage = mustache.render plainTemplate, params

        htmlTemplateName = path.join __dirname, '..', '..', 'templates', 'welcome.html.mustache'
        htmlTemplate = fs.readFileSync htmlTemplateName, 'utf8'
        htmlMessage = mustache.render htmlTemplate, params

        {
            subject: 'Welcome to VolgaCTF 2015 Quals!'
            plain: plainMessage
            html: htmlMessage
        }

module.exports = EmailController
