
exports.up = function (knex, Promise) {
  return knex.schema.createTable('team_task_reviews', (table) => {
    table.increments('id').primary()
    table.integer('teamId').notNullable().references('id').inTable('teams')
    table.integer('taskId').notNullable().references('id').inTable('tasks')
    table.integer('rating').notNullable()
    table.text('review').notNullable()
    table.dateTime('createdAt').notNullable()
    table.unique(['teamId', 'taskId'], 'team_task_reviews_ndx_team_task_unique')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('team_task_reviews')
}
