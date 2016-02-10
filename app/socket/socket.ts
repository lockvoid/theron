import * as r from 'rethinkdb';
import * as ws from 'ws';

import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/subject/ReplaySubject';
import { Subscriber } from 'rxjs/Subscriber';

import { PARSE_ERROR, SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, QUERY_VALID, QUERY_INVALID } from '../../lib/constants';
import { TheronBaseAction } from '../../lib/actions';
import { verifyClient } from './utils/verify_client';

export const app = (httpServer) => {
  const wsServer = new ws.Server({ server: httpServer, path: '/echo', verifyClient });

  wsServer.on('connection', ws => {
    let { db } = <any>ws.upgradeReq;

    ws.on('close', () => {
      db.close();
    });

    ws.on('message', (message) => {
      try {
        var action = JSON.parse(message);
      } catch(err) {
        return console.log(message);
      }

      switch (action.type) {
        case SUBSCRIBE_QUERY:
          return ws.send(JSON.stringify({ type: QUERY_VALID, subscriptionKey: action.subscriptionKey, queryKey: 'queryKey' }));
        case UNSUBSCRIBE_QUERY:
          return ws.send(JSON.stringify({ type: QUERY_VALID, subscriptionKey: action.subscriptionKey, queryKey: 'queryKey' }));
      }
    });
  });
}

