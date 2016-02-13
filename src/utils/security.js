import bcrypt from 'bcrypt'

export function getPasswordHash (password, callback) {
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      callback(err, null)
    } else {
      callback(null, hash)
    }
  })
}

export function checkPassword (password, hash, callback) {
  bcrypt.compare(password, hash, (err, res) => {
    if (err) {
      callback(err, null)
    } else {
      callback(null, res)
    }
  })
}
