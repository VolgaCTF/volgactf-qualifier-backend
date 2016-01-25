import Validator from 'validator.js'
let Assert = Validator.Assert
let Constraint = Validator.Constraint
import is_ from 'is_js'

import constants from './constants'

let pwdRegex = "^[A-Za-z0-9\\x5b\\x5d\\x28\\x29\\x7b\\x7d\\x7e\\x60\\x21\\x40\\x23\\x24\\x25\\x5e\\x26\\x2a\\x2d\\x5f\\x3d\\x2b\\x27\\x22\\x3a\\x3b\\x7c\\x2f\\x5c\\x2e\\x2c\\x3f\\x3c\\x3e]{6,40}$"
let base64urlRegex = "^[A-Za-z0-9_\\-]{3,}$"

export default {
  email: [
    new Assert().Required(),
    new Assert().Email()
  ],
  team: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 100 })
  ],
  password: [
    new Assert().Required(),
    new Assert().Length({ min: 6, max: 40 }),
    new Assert().Regexp(pwdRegex, 'g')
  ],
  country: [
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 0, max: 150 })
  ],
  locality: [
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 0, max: 150 })
  ],
  institution: [
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 0, max: 150 })
  ],
  base64url: [
    new Assert().Required(),
    new Assert().Regexp(base64urlRegex, 'g')
  ],
  username: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 100 })
  ],
  postTitle: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 250 })
  ],
  postDescription: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 4096 })
  ],
  contestState: [
    new Assert().Required(),
    new Assert().Range(constants.CONTEST_INITIAL, constants.CONTEST_FINISHED)
  ],
  contestDateTime: [
    new Assert().Required(),
    new Assert().InstanceOf(Date)
  ],
  taskCategoryTitle: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 20 })
  ],
  taskCategoryDescription: [
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 0, max: 150 })
  ],
  taskTitle: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 50 })
  ],
  taskDescription: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 4096 })
  ],
  taskHints: [
    new Assert().Callback(is_.all.string),
    new Assert().Length({ min: 0, max: constants.TASK_MAX_HINTS })
  ],
  taskValue: [
    new Assert().Required(),
    new Assert().Range(constants.TASK_MIN_VALUE, constants.TASK_MAX_VALUE)
  ],
  taskCategories: [
    new Assert().Required(),
    new Assert().Callback(is_.all.number),
    new Assert().Length({ min: 0, max: constants.TASK_MAX_CATEGORIES })
  ],
  taskAnswers: [
    new Assert().Required(),
    new Assert().Callback(is_.all.string),
    new Assert().Length({ min: 1, max: constants.TASK_MAX_ANSWERS })
  ],
  taskAnswersExtra: [
    new Assert().Callback(is_.all.string)
  ],
  taskCaseSensitive: [
    new Assert().Required(),
    new Assert().Range(0, 1)
  ],
  taskAnswer: [
    new Assert().Required(),
    new Assert().Callback(is_.string),
    new Assert().Length({ min: 2, max: 256 })
  ]
}
