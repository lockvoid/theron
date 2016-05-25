import * as WebSocket from 'ws';

import { Observable } from 'rxjs/Observable';
import { WebSocketSubject } from '../../../../lib/websocket';

import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';

export class PingWebSocket<T> extends WebSocketSubject<T> {
  protected _heartbeat: NodeJS.Timer;

  constructor(socket: WebSocket) {
    super(socket);

    this._heartbeat = setInterval(() => socket.ping(null, null, true), 50000);
  }

  enqueue<R>(next: (req: T) => Observable<R>) {
    const assignThis = object => Object.assign(object, { socket: this });

    return this.concatMap(next).map(assignThis).catch(err => Observable.throw(assignThis(err)));
  }

  protected _resetWebSocket() {
    super._resetWebSocket();

    clearTimeout(this._heartbeat);
  }
}
