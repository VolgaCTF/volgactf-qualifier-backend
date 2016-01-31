
exports.up = function(knex, Promise) {
  return knex.schema.createTable('task_answers', (table) => {
    table.increments('id').primary()
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.string('answer', 250).notNullable()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('task_answers')
}
