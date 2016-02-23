
exports.up = function (knex, Promise) {
  return knex.schema.createTable('team_task_hit_attempts', (table) => {
    table.increments('id').primary()
    table.integer('teamId').notNullable().references('id').inTable('teams')
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.string('wrongAnswer', 256).notNullable()
    table.dateTime('createdAt').notNullable()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('team_task_hit_attempts')
}
