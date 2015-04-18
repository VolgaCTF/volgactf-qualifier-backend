express = require 'express'

categoryRouter = require './task-category'

router = express.Router()
router.use '/category', categoryRouter

module.exports = router
