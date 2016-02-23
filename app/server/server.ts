'use strict';

import * as express from 'express';
import * as pg from 'pg';
import * as React from 'react';
import * as ReactDOM from 'react-dom/server';

export const app = express();

import { UserRecord } from './models/user';
import { api } from './routes/api';

//UserRecord.where('id', 1).fetch().then(function(user) {
//
//  console.log(user);
//
//});
// TEST

/*

// create functions

CREATE OR REPLACE FUNCTION theron_notify_trigger() RETURNS trigger AS $$ BEGIN
  CASE TG_OP
  WHEN 'DELETE' THEN
    PERFORM pg_notify('theron_watchers', TG_OP || ',' || TG_TABLE_NAME || ',' || OLD.id);
  ELSE
    PERFORM pg_notify('theron_watchers', TG_OP || ',' || TG_TABLE_NAME || ',' || NEW.id);
  END CASE;

  RETURN NULL;
END;

$$ LANGUAGE plpgsql;

// create triggers

DROP TRIGGER IF EXISTS theron_watch_foo ON foo;

CREATE TRIGGER theron_watch_foo AFTER INSERT OR UPDATE OR DELETE ON foo FOR EACH ROW EXECUTE PROCEDURE theron_notify_trigger();

// manage data

INSERT INTO foo (name) VALUES ('Dimitri');

DELETE FROM foo WHERE id = 1;

---

CREATE TRIGGER watched_table_trigger BEFORE INSERT OR UPDATE OR DELETE ON foo FOR EACH ROW EXECUTE PROCEDURE notify_trigger();

CREATE TRIGGER watched_table_trigger AFTER INSERT ON bar
FOR EACH ROW EXECUTE PROCEDURE notify_trigger();

*/

// pg.connect('postgres://localhost/triggers', (err, connection, done) => {
//   if (err) {
//     return console.log(err);
//   }
//
//   connection.on('notification', message => {
//     console.log(message);
//   });
//
//   connection.query('LISTEN watchers');
// });

//   try {
//     const db = pg('postgres://localhost/triggers')
//     await db.connect();
//
//     db.on('notification', function(msg) {
//       console.log(msg);
//     });
// //
// //  let query = connection.query("LISTEN watchers", (err, res) => {
// //    if (err) {
// //      return console.log(err);
// //    }
// //  });
//
//     console.log('re');
//   } catch(err) {
//     console.log(err);
//   }

//pg.connect('postgres://localhost/triggers', (err, connection, done) => {
//  if (err) {
//    return console.log(err);
//  }
//
//  connection.on('notification', function(msg) {
//    console.log(msg);
//  });
//
//  let query = connection.query("LISTEN watchers", (err, res) => {
//    if (err) {
//      return console.log(err);
//    }
//  });
//});

// Configure views


app.engine('js', (filename: string, options: any, done: Function) => {
  var markup = '<!DOCTYPE html>';

  try {
    let component = require(filename).default;

    markup += ReactDOM.renderToStaticMarkup(React.createElement(component, options));
  } catch (e) {
    return done(e);
  }

  done(null, markup);
});

app.set('views', `${__dirname}/views`);
app.set('view engine', 'js');

// Serve assets

app.use('/assets', express.static('./dist/public'));

app.use((req, res, next) => {
  req.path.indexOf("/assets") === 0 ? res.status(404).send(`Cannot GET ${req.path}`) : next();
});

if (app.get('env') === 'development') {
  app.use('/', express.static('./dist/client'));

  app.use('/jspm_packages', express.static('./jspm_packages'));

  app.get('/config.js', (req, res) => {
    res.sendFile(`${process.cwd()}/config.js`);
  });
}

// Mount routes

app.use('/api', api);

// Render pages

app.get('/*', (req, res) => {
  res.render('app');
});
