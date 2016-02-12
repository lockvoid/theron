import * as pg from 'pg';
import * as qs from 'qs';
import * as url from 'url';
import * as sql from 'sql-bricks-postgres';

export const verifyClient = async ({ origin, req, secure }, valid) => {
  let { app, secret } = qs.parse(url.parse(req.url).query);

  pg.connect(process.env['POSTGRES_URL'] || 'error', (err, appConnection, closeConnection) => {
    if (err) {
      return valid(false, 500, 'Theron internal error')
    }

    appConnection.query(sql.select('id, db').from('apps').where(secret ? { name: app, secret } : { name: app }).toString(), (err, res) => {
      if (err) {
        valid(false, 500, 'Theron internal error');
        return closeConnection();
      }

      if (!res.rows.length) {
        valid(false, 404, `App doesn't exist`);
        return closeConnection();
      }

      const { id, name, db } = res.rows[0];

      pg.connect(db || 'error', (err, clientConnection, clientClose) => {
        if (err) {
          valid(false, 403, err.toString());
          return closeConnection();
        }

        req.db = clientConnection;
        req.appId = id;
        req.appName = name;
        req.appAdmin = !!secret;
        req.dbClose = clientClose;

        closeConnection();
        valid(true);
      });
    });
  });
}
