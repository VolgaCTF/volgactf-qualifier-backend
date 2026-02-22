const Knex = require('knex')

module.exports = Knex({
  client: 'postgresql',
  connection: {
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT, 10),
    user: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN_SIZE || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX_SIZE || '10', 10),
  }
})
