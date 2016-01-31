
exports.up = function(knex, Promise) {
  return knex.schema.createTable('task_category_mappings', (table) => {
    table.increments('id').primary()
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.integer('taskCategoryId').notNullable().references('id').inTable('task_categories')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('task_category_mappings')
}
