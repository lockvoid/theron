import * as qs from 'qs';
import * as r from 'rethinkdb';
import * as url from 'url';

export const verifyClient = async ({ origin, req, secure }, done) => {
  try {
    let { db } = qs.parse(url.parse(req.url).query);

    req.db = await r.connect({ host: process.env['RETHINK_HOST'], port: process.env['RETHINK_PORT'] })

    if (!(await r.dbList().contains(db).run(req.db))) {
      throw `Database "${db}" doesn't exists`;
    }

    done(true)
  } catch (err) {
    done(false, 400, err.toString())
  }
}
