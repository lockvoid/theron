import * as WebSocket from 'ws';

import { Observable } from 'rxjs/Observable';
import { WebSocketSubject } from '../../../../lib/websocket';

import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';

const uuid = require('node-uuid');

export class AliveWebSocket<T> extends WebSocketSubject<T> {
  protected _heartbeat: NodeJS.Timer;

  constructor(socket: WebSocket) {
    super({ socket });

    socket['objectId'] = uuid.v1();

    this._heartbeat = setInterval(() => socket.ping(null, null, true), 50000);
  }

  get objectId(): number {
    return this._socket['objectId'];
  }

  enqueue<R>(next: (req: T) => Observable<R>) {
    const assignThis = object => Object.assign(object, { socket: this, session: this.objectId });

    return this.concatMap(next).map(assignThis).catch(err => Observable.throw(assignThis(err)));
  }

  protected _closeConnection() {
    super._closeConnection();

    clearTimeout(this._heartbeat);
  }
}
