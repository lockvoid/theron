import { DbError } from '../lib/errors/db_error';

import * as pg from 'pg';

export async function createNotifier(databaseUrl) {
  new Promise((resolve, reject) => {
    pg.connect(databaseUrl, (err, conn, done) => {
      if (err) {
        return reject(new DbError(400, { db_url: `Can't connect to this database` }));
      }

      conn.query(`
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
      `, (err, result) => {
        done();

        if (err) {
          return reject(new DbError(400, { db_url: `Can't setup this database` }));
        }

        resolve();
      });
    });
  });
}
