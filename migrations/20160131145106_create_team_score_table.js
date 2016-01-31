
exports.up = function(knex, Promise) {
  return knex.schema.createTable('team_scores', (table) => {
    table.increments('id').primary()
    table.integer('teamId').notNullable().references('id').inTable('teams')
    table.integer('score').notNullable()
    table.dateTime('updatedAt').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('team_scores')
}
