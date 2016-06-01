import * as WebSocket from 'ws';

import { Observable } from 'rxjs/Observable';
import { WebSocketSubject } from '../websocket';
import { BaseAction } from './base_action';

const uuid = require('node-uuid');

export class AliveWebSocket extends WebSocketSubject<any> {
  protected _heartbeat: NodeJS.Timer;

  constructor(socket: WebSocket) {
    super({ socket });

    socket['id'] = uuid.v1();

    this._heartbeat = setInterval(() => socket.ping(null, null, true), 50000);
  }

  get id(): string {
    return this._socket['id'];
  }

  protected _closeConnection() {
    super._closeConnection();

    clearTimeout(this._heartbeat);
  }
}
