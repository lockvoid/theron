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

    const subject = this.subject, observers = this.subject.observers;

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

export class WebSocketSubscriber<T> extends Subscriber<T> {
  unsubscribe() {
    super.unsubscribe();

    this.isStopped = false;
    this.isUnsubscribed = false;
  }
}

export class WebSocketSubject<T> extends AnonymousSubject<T> {
  protected _config: WebSocketSubjectConfig
  protected _socket: WebSocket;
  protected _output: Subject<T>;

  constructor(config: WebSocketSubjectConfig, source?: Observable<T>) {
    if (source instanceof Observable) {
      super(undefined, source);
    } else {
      super(new ReplaySubject());

      this._config = config;
      this._output = new Subject<T>()

      this._bind(this, '_onOpen', '_onMessage', '_onError', '_onClose');
      this._isConstructor() || this._openConnection();
    }
  }

  lift<T, R>(operator: Operator<T, R>): Observable<T> {
    const socket = new WebSocketSubject(undefined, this);
    socket.operator = operator;

    return <any>socket;
  }

  unsubscribe() {
    super.unsubscribe();
    this._closeConnection();
  }

  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    if (this.source) {
      return super._subscribe(subscriber);
    }

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
      [['message', this._onMessage], ['error', this._onError], ['close', this._onClose]].forEach(tuple => {
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener(<string>tuple[0], <any>tuple[1]);
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

    if (!this._isConstructor() && !subscription) {
      [['error', this._onError], ['close', this._onClose]].forEach(tuple => {
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener(<string>tuple[0], <any>tuple[1]); /* NODE */
      });
    }

    switch (this._socket.readyState) {
      case WebSocket.CONNECTING:
        this._socket.add/* @ifndef NODE_BUILD */Event/* @endif */Listener('open', this._onOpen); /*NODE*/
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
      this._socket.remove/* @ifndef NODE_BUILD */Event/* @endif */Listener('message', <any>this._onMessage);
    }
  }

  protected _isConstructor(): boolean {
    return typeof this._config.url === 'string';
  }

  protected _unbufferOutput() {
    const queue = this.destination;

    this.destination = new WebSocketSubscriber(
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

    if (queue && queue instanceof ReplaySubject) {
      const subscription = queue.subscribe(this.destination);

      setTimeout(() => {
        subscription.unsubscribe();
      });
    }
  }

  protected _onOpen() {
    this._config.onOpen && this._config.onOpen.next(undefined);

    this._unbufferOutput();
  }

  protected _onMessage(/* @ifndef NODE_BUILD */{/*@endif */ data /* @ifndef NODE_BUILD */}/*@endif */) {
    try {
      var res = JSON.parse(data);
    } catch (err) {
      var err = err;
    }

    if (res) {
      this._output.next(res);
    } else {
      this._output.error(err);
    }
  }

  protected _onError(err) {
    this.error(err);
  }

  protected _onClose(/* @ifndef NODE_BUILD */{/*@endif */ code, reason /* @ifndef NODE_BUILD */}/*@endif */) {
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

  protected _bind(object, ...methods) {
    methods.forEach(method => {
      object[method] = object[method].bind(object);
    })
  }
}
