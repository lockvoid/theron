import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/subject/ReplaySubject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';

class WebSocketSubject<T> extends Subject<T> {
  protected _socket;

  constructor(protected _url: string | WebSocket) {
    super();

    this.destination = new ReplaySubject();
  }

  /* protected */ _subscribe(subscriber: Subscriber<T>) {
    if (this._url && !this._socket) {
    }

    return new Subscription(() => {
    });
  }

  /* protected */ _unsubscribe() {
    this._socket = null;
  }
}

export class RescueWebSocketSubject<T> extends WebSocketSubject<T> {
}
