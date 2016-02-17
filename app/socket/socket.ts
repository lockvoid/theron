import * as pg from 'pg';
import * as ws from 'ws';

import { Router } from './router';
import { verifyClient } from './utils/verify_client';

export const app = (httpServer) => {
  const socketServer = new ws.Server({ server: httpServer, path: '/echo', verifyClient });

  socketServer.on('connection', socket => {
    let { client } = <{ client: pg.Client }>(<any>socket.upgradeReq);

    client.on('notification', message => {
      console.log(message);
    });

    client.query('LISTEN theron_watchers');

    const router = new Router(socket);

    router.subscribe(
      message => {
        console.log(`Message: ${JSON.stringify(message)}`);
      },

      error => {
        client.query('UNLISTEN theron_watchers');
        client.end();
      },

      () => {
        client.query('UNLISTEN theron_watchers');
        client.end();
      }
    );
  });
}
