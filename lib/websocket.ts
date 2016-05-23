import { Observable } from 'rxjs/Observable';
import { Observer, NextObserver } from 'rxjs/Observer';
import { Operator } from 'rxjs/Operator';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject, AnonymousSubject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';

/* @ifdef NODE_BUILD */ import * as WebSocket from 'ws'; /* @endif */

export interface WebSocketSubjectConfig {
  url?: string;
  socket?: WebSocket;
  onOpen?: NextObserver<any>;
  onClose?: NextObserver<any>;
  aroundUnbuffer?: NextObserver<any>;
}

export class WebSocketSubscription extends Subscription {
  constructor(public subject: Subject<any>, public subscriber: Observer<any>) {
    super();
  }

  unsubscribe() {
    super.unsubscribe();

    const { subject: { observers } } = this;

    if (!observers || observers.length === 0 || this.subject.isStopped || this.subject.isUnsubscribed) {
      return;
    }

    const subscriberIndex = observers.indexOf(this.subscriber);

    if (subscriberIndex !== -1) {
      observers.splice(subscriberIndex, 1);
    }

    this.subject = null;
  }
}

export class WebSocketSubject<T> extends AnonymousSubject<T> {
  protected _output: Subject<T> = new Subject<T>();
  protected _socket: WebSocket;

  private _bindings: any;

  constructor(protected _config: WebSocketSubjectConfig) {
    super(new ReplaySubject());
    !this._isConstructor() && this._openConnection();
  }

  unsubscribe() {
    super.unsubscribe();
    this._closeConnection();
  }

  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    const subscription = new WebSocketSubscription(this, subscriber);

    if (!this._socket) {
      this._openConnection(subscription);
    }

    subscription.add(this._output.subscribe(subscriber));

    subscription.add(() => {
      if (!this.observers || this.observers.length === 1) {
        this._closeConnection();
      }
    });

    this.observers.push(subscriber);

    if (this.observers.length === 1) {
      ['message', 'error', 'close'].forEach(method => {
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener(method, this._bindings[method]);
      });
    }

    return subscription;
  }

  protected _openConnection(subscription?: Subscription) {
    if (this._isConstructor()) {
      this._socket = new WebSocket(this._config.url);
    } else {
      this._socket = this._config.socket;
    }

    this._bindings = {
      open: (event) => {
        this._onOpen(subscription)
      },

      message: (/* @ifndef NODE_BUILD */{/*@endif */ data /* @ifndef NODE_BUILD */}/*@endif */) => {
        this._onMessage(data);
      },

      error: (err) => {
        this._onError(err);
      },

      close: (/* @ifndef NODE_BUILD */{/*@endif */ code, reason /* @ifndef NODE_BUILD */}/*@endif */) => {
        this._onClose(code, reason);
      },
    };

    if (!this._isConstructor() && !subscription) {
      ['error', 'close'].forEach(method => {
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener(method, this._bindings[method]); /* NODE */
      });
    }

    switch (this._socket.readyState) {
      case WebSocket.CONNECTING:
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener('open', this._bindings['open']); /*NODE*/
        break;
      case WebSocket.OPEN:
        this._onOpen();
        break;
      case WebSocket.CLOSED:
        this._output.complete();
        break;
    }
  }

  protected _closeConnection() {
    if (!this._socket) {
      return
    }

    if (this._isConstructor()) {
      this._socket.readyState < 2 && this._socket.close();
      this._socket = null;

      this.destination = new ReplaySubject();
    } else {
      this._socket.remove/* @ifndef NODE_BUILD */Event/* @endif */Listener('message', this._bindings.message);
    }
  }

  protected _isConstructor(): boolean {
    return typeof this._config.url === 'string';
  }

  protected _unbufferOutput(subscription?: Subscription) {
    const queue = this.destination;

    this.destination = new Subscriber(
      message => {
        this._socket.readyState === WebSocket.OPEN && this._socket.send(JSON.stringify(message));
      },

      err => {
        if (err && err.code) {
          this._socket.close(err.code, err.reason);
        } else {
          this._output.error(new TypeError('WebSocket.error must be called with an object with an error code and an optional reason'));
        }
      },

      () => {
        this._socket.close(1000);
      }
    );

    this._config.aroundUnbuffer && this._config.aroundUnbuffer.next(undefined);

    if (subscription && queue && queue instanceof ReplaySubject) {
      subscription.add(queue.subscribe(this.destination));
    }
  }

  protected _onOpen(subscription?: Subscription) {
    this._config.onOpen && this._config.onOpen.next(undefined);

    this._unbufferOutput(subscription);
  }

  protected _onMessage(data) {
    try {
      this._output.next(JSON.parse(data));
    } catch(err) {
      this._output.error(err);
    }
  }

  protected _onError(err) {
    this.error(err);
  }

  protected _onClose(code, reason) {
    this._config.onClose && this._config.onClose.next({ code, reason });

    if (code === 1000) {
      this._output.complete();
    } else {
      this._output.error(Object.assign({ code, reason }, { socket: null/*this*/ }));
    }

    if (this._isConstructor()) {
      this._output = new Subject();
    }
  }
}
