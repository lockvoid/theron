import { id } from '../utils';

export async function up(db, done) {
  await db.createTable('users', { id,
    email: {
      type: 'string', unique: true,
    },

    encrypted_password: {
      type: 'string',
    },

    name: {
      type: 'string',
    },
  });

  done();
};

export async function down(db, done) {
  await db.dropTable('users');
  done();
};
