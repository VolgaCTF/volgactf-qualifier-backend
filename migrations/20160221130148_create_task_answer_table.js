
exports.up = function (knex, Promise) {
  return knex.schema.createTable('task_answers', (table) => {
    table.increments('id').primary()
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.string('answer', 256).notNullable()
    table.boolean('caseSensitive').notNullable()
    table.dateTime('createdAt').notNullable()
    table.unique(['taskId', 'answer'], 'task_answers_ndx_task_answer_unique')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('task_answers')
}
