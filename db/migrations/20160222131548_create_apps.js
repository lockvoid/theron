exports.up = (knex) => {
  return knex.schema.createTable('apps', table => {
    table.bigincrements('id').primary();
    table.string('name').unique().notNullable();
    table.string('secret').notNullable();
    table.boolean('development').defaultTo(true);
    table.string('app_url');
    table.string('db_url');
    table.biginteger('user_id').unsigned().references('id').inTable('users').notNullable();
    table.string('created_at').notNullable();
    table.string('updated_at').notNullable();
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable('apps');
};
