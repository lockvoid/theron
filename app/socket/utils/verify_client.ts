import * as pg from 'pg';
import * as qs from 'qs';
import * as url from 'url';

import { SQL } from '../../../lib/utils/sql';

export const verifyClient = async ({ origin, req, secure }, valid) => {
  let name = qs.parse(url.parse(req.url).query).app;

  pg.connect(process.env['POSTGRES_URL'], (err, client, done) => {
    if (err) {
      return valid(false, 500, err.toString());
    }

    client.query(SQL`SELECT db FROM apps WHERE name=${name} LIMIT 1`, (err, result) => {
      done();

      if (result.rowCount === 0) {
        return valid(false, 404);
      }

      let app = result.rows[0];

      pg.connect(app.db, (err, client) => {
        if (err) {
          return valid(false, 500, err.toString());
        }

        Object.assign(req, { app, client });

        valid(true);
      });
    });
  });
}
