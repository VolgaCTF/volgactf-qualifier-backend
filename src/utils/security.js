const bcrypt = require('bcrypt')

module.exports.getPasswordHash = function (password, callback) {
  bcrypt.hash(password, 10, function (err, hash) {
    if (err) {
      callback(err, null)
    } else {
      callback(null, hash)
    }
  })
}

module.exports.checkPassword = function (password, hash, callback) {
  bcrypt.compare(password, hash, function (err, res) {
    if (err) {
      callback(err, null)
    } else {
      callback(null, res)
    }
  })
}
