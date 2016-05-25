import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Operator } from 'rxjs/Operator';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription, TeardownLogic } from 'rxjs/Subscription';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';

/* @ifdef NODE_BUILD */ import * as WebSocket from 'ws'; /* @endif */

export class WebSocketSubject<T> extends Subject<T> {
  static objectId = 0;

  protected _socket: WebSocket;
  protected _config: string | WebSocket;

  private _objectId: number;
  private _bindings: any;

  constructor(config: string | WebSocket | Observable<T>, destination?: Observer<T>) {
    if (config instanceof Observable) {
      super(destination, config);
    } else {
      super(new ReplaySubject());

      this._objectId = WebSocketSubject.objectId++;
      this._config = config;

      if (!this._isWebSocketOwner()) {
        this._emitWebSocket();
      }
    }
  }

  get objectId(): number {
    return this._objectId;
  }

  lift<R>(operator: Operator<T, R>) {
    const socket = new WebSocketSubject<T>(this, this.destination);
    socket.operator = <any>operator;

    return socket;
  }

  protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
    if (!this.observers) {
      this.observers = [];
    }

    const subscription = <Subscription>super._subscribe(subscriber);

    if (this.source || !subscription || subscription.isUnsubscribed) {
      return subscription;
    }

    if (!this._socket) {
      this._emitWebSocket(subscription);
    }

    if (this.observers.length === 1) {
      this._bindings['message'] = (/* @ifndef NODE_BUILD */{/*@endif */ data /* @ifndef NODE_BUILD */}/*@endif */)=> {
        this._onMessage(data);
      }

      this._bindings['error'] = err => {
        this._onError(err);
      }

      this._bindings['close'] = (/* @ifndef NODE_BUILD */{/*@endif */ code, reason /* @ifndef NODE_BUILD */}/*@endif */) => {
        this._onClose(code, reason);
      }

      ['message', 'error', 'close'].forEach(method => {
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener(method, this._bindings[method]);
      });
    }

    return new Subscription(() => {
      subscription.unsubscribe();

      if (!this.observers || this.observers.length === 0) {
        this._resetWebSocket();
      }
    });
  }

  protected _unsubscribe() {
    super._unsubscribe();

    if (this._isWebSocketOwner()) {
      this.isStopped = false;
      this.isUnsubscribed = false;
      this.hasErrored = false;
      this.hasCompleted = false;
    }

    this._resetWebSocket();
  }

  protected _emitWebSocket(subscription?: Subscription) {
    this._socket = this._constructWebSocket(this._config);

    this._bindings = Object.assign(this._bindings || {}, {
      open: () => {
        this._onOpen(subscription)
      }
    });

    switch (this._socket.readyState) {
      case WebSocket.CONNECTING:
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener('open', this._bindings['open']);
        break;
      case WebSocket.OPEN:
        this._unbufferMessages(subscription);
        break;
      case WebSocket.CLOSED:
        return this._finalComplete();
    }
  }

  protected _constructWebSocket(url: string | WebSocket): WebSocket {
    if (typeof url === 'string') {
      return new WebSocket(url);
    } else {
      return url;
    }
  }

  protected _resetWebSocket() {
    if (!this._socket) {
      return
    }

    ['message', 'error', 'close'].forEach(method => {
      this._socket.remove/* @ifndef NODE_BUILD */Event/* @endif */Listener(method, this._bindings[method]);
    });

    if (this._isWebSocketOwner()) {
      this._socket.remove/* @ifndef NODE_BUILD */Event/* @endif */Listener('open', this._bindings['open']);
      this._socket.readyState < 2 && this._socket.close();
      this._socket = null;

      this.destination = new ReplaySubject();
    }
  }

  protected _isWebSocketOwner(): boolean {
    return typeof this._config === 'string';
  }

  protected _isWebSocketHot(): boolean {
    return !!this._socket;
  }

  protected _unbufferMessages(subscription?: Subscription) {
    const queue = this.destination;

    this.destination = Subscriber.create(
      message => {
        this._socket.readyState === WebSocket.OPEN && this._socket.send(JSON.stringify(message));
      },

      err => {
        if (err && err.code) {
          this._socket.close(err.code, err.reason);
        } else {
          this._finalError(new TypeError('WebSocket.error must be called with an object with an error code and an optional reason'));
        }
      },

      () => {
        this._socket.close();
      }
    );

    if (subscription && queue && queue instanceof ReplaySubject) {
      subscription.add(queue.subscribe(this.destination));
    }
  }

  protected _onOpen(subscription: Subscription) {
    this._unbufferMessages(subscription);
  }

  protected _onMessage(data) {
    try {
      this._finalNext(JSON.parse(data));
    } catch(error) {
      this._finalError(error);
    }
  }

  protected _onError(err) {
    this.error(err);
  }

  protected _onClose(code, reason) {
    if (code === 1000) {
      this._finalComplete();
    } else {
      this._finalError(Object.assign({ code, reason }, { socket: this }));
    }
  }
}

export class RescueWebSocketSubject<T> extends WebSocketSubject<T> {
}
