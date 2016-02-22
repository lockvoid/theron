import * as ws from 'ws';
import * as knex from 'knex';

import { Router } from './router';
import { verifyClient } from './utils/verify_client';

export const app = (httpServer) => {
  const socketServer = new ws.Server({ server: httpServer, path: '/echo', verifyClient });

  socketServer.on('connection', (socket) => {
    let { db } = <{ db: knex }>(<any>socket.upgradeReq);

    const router = new Router(socket);

    router.subscribe(
      message => {
        console.log(`Message: ${JSON.stringify(message)}`);
      },

      error => {
        db.raw('UNLISTEN theton_watchers');
        db.destroy();
      },

      () => {
        db.raw('UNLISTEN theton_watchers');
        db.destroy();
      }
    );
  });
}
