import Category from '../models/category'
import { InternalError, CategoryNotFoundError, DuplicateCategoryTitleError, CategoryAttachedError } from '../utils/errors'
import categorySerializer from '../serializers/category'
import publish from '../utils/publisher'

import BaseEvent from '../utils/events'
import logger from '../utils/logger'
import constants from '../utils/constants'

class CreateCategoryEvent extends BaseEvent {
  constructor (category) {
    super('createCategory')
    let categoryData = categorySerializer(category)
    this.data.supervisors = categoryData
    this.data.teams = categoryData
    this.data.guests = categoryData
  }
}

class UpdateCategoryEvent extends BaseEvent {
  constructor (category) {
    super('updateCategory')
    let categoryData = categorySerializer(category)
    this.data.supervisors = categoryData
    this.data.teams = categoryData
    this.data.guests = categoryData
  }
}

class RemoveCategoryEvent extends BaseEvent {
  constructor (categoryId) {
    super('removeCategory')
    let categoryData = { id: categoryId }
    this.data.supervisors = categoryData
    this.data.teams = categoryData
    this.data.guests = categoryData
  }
}

class CategoryController {
  static list (callback) {
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
        publish('realtime', new CreateCategoryEvent(category))
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
        publish('realtime', new UpdateCategoryEvent(category))
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

  static remove (id, callback) {
    // CategoryAttachedError
    Category
      .query()
      .delete()
      .where('id', id)
      .then((numDeleted) => {
        if (numDeleted === 0) {
          callback(new CategoryNotFoundError())
        } else {
          publish('realtime', new RemoveCategoryEvent(id))
          callback(null)
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
