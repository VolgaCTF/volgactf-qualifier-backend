// const logger = require('../utils/logger')
const request = require('request')

class TelegramController {
  constructor () {
    this.botAccessToken = process.env.TELEGRAM_BOT_ACCESS_TOKEN
    this.chatId = process.env.TELEGRAM_CHAT_ID
  }

  post (description) {
    return new Promise((resolve, reject) => {
      request({
        method: 'GET',
        url: `https://api.telegram.org/bot${this.botAccessToken}/sendMessage`,
        qs: {
          chat_id: this.chatId,
          text: description,
          parse_mode: 'Markdown'
        }
      }, (err, response, body) => {
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
