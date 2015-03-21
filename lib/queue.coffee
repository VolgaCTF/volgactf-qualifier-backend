queue = require './utils/queue'
logger = require './utils/logger'
gm = require 'gm'
path = require 'path'
mandrill = require 'mandrill-api/mandrill'
EmailController = require './controllers/email'
token = require './utils/token'


queue('createLogoQueue').process (job, done) ->
    newFilename = path.join process.env.LOGOS_DIR, "team-#{job.data.id}.png"
    gm(job.data.filename).write newFilename, (err) ->
        if err?
            logger.error err
            throw err
        else
            done()


queue('sendEmailQueue').process (job, done) ->
    welcomeMessage = EmailController.generateWelcomeEmail
        name: job.data.name
        domain: process.env.DOMAIN
        team: token.encode job.data.email
        code: token.encode job.data.token

    params =
        message:
            html: welcomeMessage.html
            text: welcomeMessage.plain
            subject: welcomeMessage.subject
            from_email: process.env.EMAIL_SENDER
            from_name: 'VolgaCTF'
            to: [
                email: job.data.email
                name: job.data.name
                type: 'to'
            ]
            trans_opens: yes
            trans_clicks: yes
            auto_text: no
            auto_html: no
            url_strip_qs: no
        async: no

    onSend = (result) ->
        logger.info result
        done()

    onError = (e) ->
        logger.error "A mandrill error occurred: #{e.name} - #{e.message}"
        done()

    client = new mandrill.Mandrill process.env.MANDRILL_API_KEY
    client.messages.send params, onSend, onError
