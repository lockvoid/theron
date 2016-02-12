import { id, foreignKey, indexName } from '../utils';

export async function up(db, done) {
  await db.createTable('queries', { id,
    app_id: {
      type: 'int', foreignKey: foreignKey('apps', 'app_id'),
    },

    name: {
      type: 'string',
    },

    dispatchable: {
      type: 'text',
    },
  });

  await db.addIndex(...indexName('queries', ['app_id', 'name'], true));

  done();
};

export async function down(db, done) {
  await db.dropTable('queries');
  done();
};
