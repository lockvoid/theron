import * as ws from 'ws';
import * as pg from 'pg';

import { Router } from './router';
import { verifyClient } from './utils/verify_client';

export const app = (httpServer) => {
  const socketServer = new ws.Server({ server: httpServer, path: '/echo', verifyClient });

  socketServer.on('connection', (socket) => {
    let { db } = <{ db: pg.Client }>(<any>socket.upgradeReq);

    db.on('notification', message => {
      console.log(message);
    });

    const router = new Router(socket);

    router.subscribe(
      message => {
        console.log(`Message: ${JSON.stringify(message)}`);
      },

      error => {
        db.query('UNLISTEN theron_watchers');
        db.end();
      },

      () => {
        db.query('UNLISTEN theron_watchers');
        db.end();
      }
    );
  });
}
