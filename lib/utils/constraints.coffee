Assert = require('validator.js').Assert

pwdRegex = "^[A-Za-z0-9\\[\\]\\(\\)\\{\\}~`!@#\\$%\\^&\\*\\-_=\\+'\":;|/\\\\\\.,\\?\\<\\>]{6,40}$"
base64urlRegex = "^[A-Za-z0-9_\\-]{3,}$"

module.exports =
    email: [new Assert().NotBlank(), new Assert().Email()]
    team: [new Assert().NotBlank(), new Assert().Length(min: 2, max: 100)]
    password: [
        new Assert().NotBlank()
        new Assert().Length(min: 6, max: 40)
        new Assert().Regexp(pwdRegex, 'g')
    ]
    login: [new Assert().NotBlank(), new Assert().Length(min: 2, max: 100)]
    country: [new Assert().Length(min: 0, max: 150)]
    locality: [new Assert().Length(min: 0, max: 150)]
    institution: [new Assert().Length(min: 0, max: 150)]
    base64url: [new Assert().Required(), new Assert().Regexp(base64urlRegex, 'g')]
