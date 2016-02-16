import * as pg from 'pg';
import * as sql from 'sql-bricks-postgres';

import { Server as WebSocketServer } from 'ws';

import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/subject/ReplaySubject';
import { Subscriber } from 'rxjs/Subscriber';

import { REQUEST_SUCCESS, REQUEST_FAILURE,DISPATCH_QUERY, PARSE_ERROR, UPSERT_QUERY, REMOVE_QUERY, SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, QUERY_VALID, QUERY_INVALID } from '../../lib/constants';
import { TheronAction } from '../../lib/action';
import { verifyClient } from './utils/verify_client';
import { Router } from './router';

export const app = (httpServer) => {
  const socketServer = new WebSocketServer({ server: httpServer, path: '/echo', verifyClient });

  socketServer.on('connection', socket => {
    const router = new Router(socket);

    router.subscribe(
      message => {
        console.log(message);
      },

      error => {
        console.log(error.code);
      },

      () => {
        console.log('done');
      }
    );

    // let { appId, appName, appAdmin, db, dbClose } = <{ appId: number, appName: string, appAdmin: boolean, db: pg.Client, dbClose: Function }>(<any>ws.upgradeReq);

    db.on('notification', message => {
      console.log(message);
    });

    db.query('LISTEN watchers');

    /*

    ws.on('close', () => {
      dbClose();
    });

    ws.on('message', (message) => {
      try {
        var action = JSON.parse(message);
      } catch(err) {
        return console.log(message);
      }

      switch (action.type) {
        case DISPATCH_QUERY:
          return dispatchQuery();
        case SUBSCRIBE_QUERY:
          return ws.send(JSON.stringify({ type: QUERY_VALID, subscriptionKey: action.subscriptionKey, queryKey: 'queryKey' }));
        case UNSUBSCRIBE_QUERY:
          return ws.send(JSON.stringify({ type: QUERY_VALID, subscriptionKey: action.subscriptionKey, queryKey: 'queryKey' }));
      }

      if (appAdmin) {
        switch (action.type) {
          case UPSERT_QUERY:
            return upsertQuery(ws, appId, action.name, action.dispatchable);
          case REMOVE_QUERY:
            return removeQuery(ws, appId, action.name);
        }
      } else {

      }
    }); */
  });
}

const dispatchQuery = () => {
  console.log('dispatch query');
}

const upsertQuery = (ws, appId: number, name: string, dispatchable: string) => {
  if (!name) {
    ws.send(JSON.stringify({ type: REQUEST_FAILURE, origin: UPSERT_QUERY, name, reason: 'Invalid query: Name is required' }));
  }

  if (!dispatchable) {
    ws.send(JSON.stringify({ type: REQUEST_FAILURE, origin: UPSERT_QUERY, name, reason: `Invalid query (${name}): Dispatchable is required` }));
  }

  pg.connect(process.env['POSTGRES_URL'], (err, db, close) => {
    let text = `INSERT INTO queries(app_id, name, callback) VALUES($1, $2, $3) ON CONFLICT(app_id, name) DO update SET callback = $3`;

    db.query({ text, values: [appId, name, dispatchable] }, err => {
      if (err) {
        ws.send(JSON.stringify({ type: REQUEST_FAILURE, origin: UPSERT_QUERY, name, reason: err.toString() }));
      } else {
        ws.send(JSON.stringify({ type: REQUEST_SUCCESS, origin: UPSERT_QUERY, name }));
      }

      close();
    });
  });
}

const removeQuery = (ws, appId: number, queryName: string) => {
  if (!queryName) {
    ws.send(JSON.stringify({ type: REQUEST_FAILURE, origin: UPSERT_QUERY, queryName: queryName, reason: 'Invalid query: Name is required' }));
  }

  pg.connect(process.env['POSTGRES_URL'], (err, db, close) => {
    db.query(sql.delete().from('queries').where({ app_id: appId, name: queryName }).toString(), err => {
      if (err) {
        ws.send(JSON.stringify({ type: REQUEST_SUCCESS, origin: REMOVE_QUERY, queryName: queryName, reason: err.toString() }));
      } else {
        ws.send(JSON.stringify({ type: REQUEST_SUCCESS, origin: REMOVE_QUERY, queryName: queryName }));
      }

      close();
    });
  });
}
