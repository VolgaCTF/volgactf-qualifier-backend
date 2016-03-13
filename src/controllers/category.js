import Category from '../models/category'
import { InternalError, CategoryNotFoundError, DuplicateCategoryTitleError, CategoryAttachedError } from '../utils/errors'
import EventController from './event'

import logger from '../utils/logger'
import constants from '../utils/constants'

import CreateCategoryEvent from '../events/create-category'
import UpdateCategoryEvent from '../events/update-category'
import DeleteCategoryEvent from '../events/delete-category'

class CategoryController {
  static index (callback) {
    Category
      .query()
      .then((categories) => {
        callback(null, categories)
      })
      .catch((err) => {
        logger.error(err)
        callback(new InternalError(), null)
      })
  }

  static get (id, callback) {
    Category
      .query()
      .where('id', id)
      .first()
      .then((category) => {
        if (category) {
          callback(null, category)
        } else {
          callback(new CategoryNotFoundError(), null)
        }
      })
      .catch((err) => {
        logger.error(err)
        callback(new CategoryNotFoundError(), null)
      })
  }

  static isCategoryTitleUniqueConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_UNIQUE_CONSTRAINT_VIOLATION && err.constraint && err.constraint === 'categories_ndx_title_unique')
  }

  static isTaskCategoryForeignKeyConstraintViolation (err) {
    return (err.code && err.code === constants.POSTGRES_FOREIGN_KEY_CONSTRAINT_VIOLATION && err.table && err.table === 'task_categories')
  }

  static create (title, description, callback) {
    let now = new Date()
    Category
      .query()
      .insert({
        title: title,
        description: description,
        createdAt: now,
        updatedAt: now
      })
      .then((category) => {
        callback(null, category)
        EventController.push(new CreateCategoryEvent(category))
      })
      .catch((err) => {
        if (this.isCategoryTitleUniqueConstraintViolation(err)) {
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
      .then((category) => {
        callback(null, category)
        EventController.push(new UpdateCategoryEvent(category))
      })
      .catch((err) => {
        if (this.isCategoryTitleUniqueConstraintViolation(err)) {
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
      .then((categories) => {
        if (categories.length === 1) {
          callback(null)
          EventController.push(new DeleteCategoryEvent(categories[0]))
        } else {
          callback(new CategoryNotFoundError())
        }
      })
      .catch((err) => {
        if (this.isTaskCategoryForeignKeyConstraintViolation(err)) {
          callback(new CategoryAttachedError())
        } else {
          logger.error(err)
          callback(new InternalError())
        }
      })
  }
}

export default CategoryController
