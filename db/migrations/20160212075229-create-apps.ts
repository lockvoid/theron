import { id, foreignKey } from '../utils';

export async function up(db, done) {
  await db.createTable('apps', { id,
    user_id: {
      type: 'int', foreignKey: foreignKey('users', 'user_id'),
    },

    name: {
      type: 'string', unique: true,
    },

    secret: {
      type: 'string', unique: true,
    },

    db: {
      type: 'string',
    },
  });

  done();
}

export async function down(db, done) {
  await db.dropTable('apps');
  done();
}
