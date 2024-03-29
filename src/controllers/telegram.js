const request = require('request')
const Agent = require('socks5-https-client/lib/Agent')

class TelegramController {
  constructor () {
    this.botAccessToken = process.env.TELEGRAM_BOT_ACCESS_TOKEN
    this.chatId = process.env.TELEGRAM_CHAT_ID
    this.socks5 = Object.hasOwn(process.env, 'TELEGRAM_SOCKS5_HOST') && process.env.TELEGRAM_SOCKS5_HOST !== '' && Object.hasOwn(process.env, 'TELEGRAM_SOCKS5_PORT') && process.env.TELEGRAM_SOCKS5_PORT !== ''
    if (this.socks5) {
      this.socks5Options = {
        socksHost: process.env.TELEGRAM_SOCKS5_HOST,
        socksPort: parseInt(process.env.TELEGRAM_SOCKS5_PORT, 10)
      }
      if (Object.hasOwn(process.env, 'TELEGRAM_SOCKS5_USERNAME') && process.env.TELEGRAM_SOCKS5_USERNAME !== '' && Object.hasOwn(process.env, 'TELEGRAM_SOCKS5_PASSWORD') && process.env.TELEGRAM_SOCKS5_PASSWORD !== '') {
        this.socks5Options.socksUsername = process.env.TELEGRAM_SOCKS5_USERNAME
        this.socks5Options.socksPassword = process.env.TELEGRAM_SOCKS5_PASSWORD
      }
    }
  }

  post (description) {
    return new Promise((resolve, reject) => {
      const params = {
        method: 'GET',
        url: `https://api.telegram.org/bot${this.botAccessToken}/sendMessage`,
        qs: {
          chat_id: this.chatId,
          text: description,
          parse_mode: 'Markdown'
        }
      }
      if (this.socks5) {
        params.agentClass = Agent
        params.agentOptions = this.socks5Options
      }
      request(params, function (err, response, body) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

module.exports = new TelegramController()
