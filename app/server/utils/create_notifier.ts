import { DbError } from '../lib/errors/db_error';

const pg = require('pg-promise')();

export async function createNotifier(dbUrl) {
  const db = pg(dbUrl);

  try {
    await db.query('SELECT 1');
  } catch(error) {
    throw new DbError(400, { db_url: `Can't connect to this database` });
  }

  try {
    await db.query(`
      create or replace function theron_notify_trigger() returns trigger as $$ begin
        case tg_op
        when 'DELETE' then
          perform pg_notify('theron_watchers', tg_op || ',' || tg_table_name || ',' || old.id);
        else
          perform pg_notify('theron_watchers', tg_op || ',' || tg_table_name || ',' || new.id);
        end case;

        return null;
      end;

      $$ language plpgsql;
    `);
  } catch(error) {
    throw new DbError(400, { db_url: `Can't setup this database` });
  }
}
