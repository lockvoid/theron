import * as WebSocket from 'ws';

import { Subscription, AnonymousSubscription } from 'rxjs/Subscription';
import { AliveWebSocket } from '../../lib/core/alive_websocket';
import { SocketHive } from '../../lib/core/socket_hive';
import { RequestRouter } from '../../lib/core/request_router';
import { SERVER_RESTARTING } from '../../lib/core/constants/errors';

const hive = new SocketHive();

export function up(httpServer): AnonymousSubscription {
  const socketServer = new WebSocket.Server({ server: httpServer });

  socketServer.on('connection', socket => {
    const aliveSocket = new AliveWebSocket(socket);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`SERVER: Session (${aliveSocket.id}) is opened`);

      aliveSocket.subscribe(
        message => {
          console.log(`SERVER: Message ${JSON.stringify(message)}`);
        },

        err => {
          console.log(`SERVER: Error ${JSON.stringify({ code: err.code, reason: err.reason})}`);
        },

        () => {
          console.log(`SERVER: Session (${aliveSocket.id}) is closed`);
        }
      );
    }

    const router = new RequestRouter(aliveSocket).subscribe(hive);
  });

  return new Subscription(() => {
    socketServer.clients.forEach(socket => {
      socket.close(SERVER_RESTARTING, `Theron is restarting`);
    });
  });
}
