import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Operator } from 'rxjs/Operator';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';

/* @ifdef NODE_BUILD */

import * as WebSocket from 'ws';

export interface CloseEvent {
  wasClean: boolean;
  code: number;
  reason: string;
  target: WebSocket;
}

export interface MessageEvent {
  data: any;
  type: string;
  target: WebSocket;
}

/* @endif */

export interface WebSocketSubjectConfig {
}

export class WebSocketSubject<T> extends Subject<T> {
  protected _socket: WebSocket;
  protected _config: string | WebSocket

  constructor(config: string | WebSocket) {
    super();

    this._config = config;
    this._cacheOutgoingMessages();
  }

  multiplex(subscribeMessage: () => T, unsubscribeMessage: () => T, messageFilter: (value: T) => boolean): Observable<T> {
    return new Observable<T>(observer => {
      subscribeMessage && this.next(subscribeMessage());

      let subscription = this.filter(messageFilter).subscribe(
        message => {
          observer.next(message);
        },

        error => {
          observer.error(error);
        },

        () => {
          observer.complete();
        }
      );

      return () => {
        unsubscribeMessage && this.next(unsubscribeMessage());
        subscription.unsubscribe();
      };
    });
  }

  protected _subscribe(subscriber: Subscriber<T>): Subscription | Function | void {
    if (!this.observers) {
      this.observers = [];
    }

    const subscription = <Subscription>super._subscribe(subscriber);

    if (!subscription || subscription.isUnsubscribed) {
      return subscription;
    }

    if (!this._socket) {
      this._socket = this._constructWebSocket(this._config);

      switch (this._socket.readyState) {
        case WebSocket.CONNECTING:
          this._socket.onopen = () => this._createDestination(subscription);
          break;
        case WebSocket.OPEN:
          this._createDestination(subscription);
          break;
        case WebSocket.CLOSED:
          return this._finalComplete();
      }

      this._socket.onerror = (error) => {
        console.log(`Theron: ${(<any>error).message}`);
        this.error(error);
      }

      this._socket.onclose = (event: CloseEvent) => {
        if (event.wasClean) {
          this._finalComplete();
        } else {
          this._finalError(event);
        }
      };

      this._socket.onmessage = (event: MessageEvent) => {
        try {
          this._finalNext(JSON.parse(event.data));
        } catch(error) {
          this._finalError(error);
        }
      }
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

    this.isStopped = false;
    this.isUnsubscribed = false;
    this.hasErrored = false;
    this.hasCompleted = false;

    this._resetWebSocket();
  }

  protected _constructWebSocket(url: string | WebSocket): WebSocket {
    if (typeof url === 'string') {
      return new WebSocket(url);
    } else {
      return url;
    }
  }

  protected _isWebSocketOwner(): boolean {
    return typeof this._config === 'string';
  }

  protected _resetWebSocket() {
    this._cacheOutgoingMessages();

    if (this._isWebSocketOwner() && this._socket && this._socket.readyState < 2) {
      this._socket.close();
    }

    this._socket = null;
  }

  protected _cacheOutgoingMessages() {
    this.destination = new ReplaySubject();
  }

  protected _createDestination(subscription: Subscription) {
    const queue = this.destination;

    this.destination = Subscriber.create(
      message => {
        this._socket.readyState === WebSocket.OPEN && this._socket.send(JSON.stringify(message));
      },

      error => {
        this._socket.close(error.code, error.reason);
      },

      () => {
        this._socket.close();
      }
    );

    if (queue && queue instanceof ReplaySubject) {
      subscription.add(queue.subscribe(this.destination));
    }
  }
}

export class RescueWebSocketSubject<T> extends WebSocketSubject<T> {
}
