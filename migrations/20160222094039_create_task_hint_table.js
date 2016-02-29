
exports.up = function (knex, Promise) {
  return knex.schema.createTable('task_hints', (table) => {
    table.increments('id').primary()
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.text('hint').notNullable()
    table.dateTime('createdAt').notNullable()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('task_hints')
}
