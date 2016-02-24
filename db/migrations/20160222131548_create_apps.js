exports.up = (knex) => {
  return knex.schema.createTable('apps', table => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.string('secret_key').unique().notNullable();
    table.string('app_url');
    table.string('db_url');
    table.integer('user_id').references('users.id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable('apps');
};
