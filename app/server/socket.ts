import * as WebSocket from 'ws';

import { AliveWebSocket } from './lib/core/alive_websocket';
import { RequestRouter } from './lib/core/request_router';
import { ChannelHive } from './lib/core/channel_hive';

import 'rxjs/add/operator/share';

const hive = new ChannelHive();

export const app = async (httpServer) => {
  const socketServer = new WebSocket.Server({ server: httpServer });

  socketServer.on('connection', socket => {
    const aliveSocket = new AliveWebSocket(socket);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`----> Session (${aliveSocket.objectId}) is opened`);

      aliveSocket.subscribe(
        message => {
          console.log(`<---- Message: ${JSON.stringify(message)}`);
        },

        err => {
          console.log(`----> Error: ${JSON.stringify({ code: err.code, reason: err.reason})}`);
        },

        () => {
          console.log(`----> Session (${aliveSocket.objectId}) is closed`);
        }
      );
    }

    // Waiting for each new request to proceed before merging the next.

    const router = aliveSocket.enqueue(new RequestRouter().next).share();

    // Then broadcast across the connected clients.

    router.subscribe(hive);
  });
}

export function teardown() {
}
