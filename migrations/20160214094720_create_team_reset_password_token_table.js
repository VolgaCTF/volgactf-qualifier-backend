
exports.up = function (knex, Promise) {
  return knex.schema.createTable('team_reset_password_tokens', (table) => {
    table.increments('id').primary()
    table.integer('teamId').notNullable().references('id').inTable('teams')
    table.binary('token').notNullable()
    table.boolean('used').notNullable()
    table.dateTime('createdAt').notNullable()
    table.dateTime('expiresAt').notNullable()
    table.unique(['token'], 'team_reset_password_tokens_ndx_token_unique')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('team_reset_password_tokens')
}
