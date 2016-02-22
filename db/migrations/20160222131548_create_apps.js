exports.up = (knex) => {
  return knex.schema.createTable('apps', table => {
    table.increments('id').primary();
    table.string('name').unique();
    table.string('secret_key').unique();
    table.string('app_url');
    table.string('db_url');
    table.integer('user_id').references('users.id')
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable('apps');
};
