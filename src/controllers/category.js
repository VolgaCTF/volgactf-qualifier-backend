const Category = require('../models/category')
const { InternalError, CategoryNotFoundError, DuplicateCategoryTitleError, CategoryAttachedError } = require('../utils/errors')
const EventController = require('./event')

const logger = require('../utils/logger')
const { POSTGRES_UNIQUE_CONSTRAINT_VIOLATION, POSTGRES_FOREIGN_KEY_CONSTRAINT_VIOLATION } = require('../utils/constants')

const CreateCategoryEvent = require('../events/create-category')
const UpdateCategoryEvent = require('../events/update-category')
const DeleteCategoryEvent = require('../events/delete-category')

class CategoryController {
  static index (callback) {
    Category
      .query()
      .then(function (categories) {
        callback(null, categories)
      })
      .catch(function (err) {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static get (id, callback) {
    Category
      .query()
      .where('id', id)
      .first()
      .then(function (category) {
        if (category) {
          callback(null, category)
        } else {
          callback(new CategoryNotFoundError(), null)
        }
      })
      .catch(function (err) {
        logger.error(err)
        callback(new CategoryNotFoundError(), null)
      })
  }

  static isCategoryTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'categories_ndx_title_unique')
  }

  static isTaskCategoryForeignKeyConstraintViolation (err) {
    return (err.code && err.code === POSTGRES_FOREIGN_KEY_CONSTRAINT_VIOLATION && err.table && err.table === 'task_categories')
  }

  static create (title, description, callback) {
    const now = new Date()
    Category
      .query()
      .insert({
        title: title,
        description: description,
        createdAt: now,
        updatedAt: now
      })
      .then(function (category) {
        callback(null, category)
        EventController.push(new CreateCategoryEvent(category))
      })
      .catch(function (err) {
        if (CategoryController.isCategoryTitleUniqueConstraintViolation(err)) {
          callback(new DuplicateCategoryTitleError(), null)
        } else {
          logger.error(err)
          callback(new InternalError(), null)
        }
      })
  }

  static update (id, title, description, callback) {
    Category
      .query()
      .patchAndFetchById(id, {
        title: title,
        description: description,
        updatedAt: new Date()
      })
      .then(function (category) {
        callback(null, category)
        EventController.push(new UpdateCategoryEvent(category))
      })
      .catch(function (err) {
        if (CategoryController.isCategoryTitleUniqueConstraintViolation(err)) {
          callback(new DuplicateCategoryTitleError(), null)
        } else {
          logger.error(err)
          callback(new InternalError(), null)
        }
      })
  }

  static delete (id, callback) {
    Category
      .query()
      .delete()
      .where('id', id)
      .returning('*')
      .then(function (categories) {
        if (categories.length === 1) {
          callback(null)
          EventController.push(new DeleteCategoryEvent(categories[0]))
        } else {
          callback(new CategoryNotFoundError())
        }
      })
      .catch(function (err) {
        if (CategoryController.isTaskCategoryForeignKeyConstraintViolation(err)) {
          callback(new CategoryAttachedError())
        } else {
          logger.error(err)
          callback(new InternalError())
        }
      })
  }
}

module.exports = CategoryController
