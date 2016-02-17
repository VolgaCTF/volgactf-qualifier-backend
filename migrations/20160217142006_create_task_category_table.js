
exports.up = function (knex, Promise) {
  return knex.schema.createTable('task_categories', (table) => {
    table.increments('id').primary()
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.integer('categoryId').notNullable().references('id').inTable('categories')
    table.dateTime('createdAt').notNullable()
    table.unique(['taskId', 'categoryId'], 'task_categories_ndx_task_category_unique')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('task_categories')
}
