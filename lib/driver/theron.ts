import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { NextObserver } from 'rxjs/Observer';
import { WebSocketSubject } from '../websocket';
import { Cache } from './cache';
import { uuid } from './uuid';
import { hmac } from './sha256';
import { CONNECT, DISCONNECT, PING, PONG, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH } from '../constants';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/timer';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/onErrorResumeNext';
import 'rxjs/add/operator/publishLast';
import 'rxjs/add/operator/retryWhen';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/switchMap';

export * from '../constants';

export interface TheronOptions {
  app: string;
  secret?: string;
  onConnect?: NextObserver<any>;
  onDisconnect?: NextObserver<any>;
}

export interface TheronAuthOptions {
  headers?: any;
  params?: any;
}

export interface TheronSecureOptions {
  sign?: string;
}

export interface TheronRescueOptions {
  retry?: boolean;
}

export type TheronTransport<T> = T & { type: string, id: string }

export class Theron extends WebSocketSubject<any> {
  protected _auth: TheronAuthOptions = {};

  static sign(data: string = '', secret: string = ''): string {
    return hmac(secret, data);
  }

  constructor(url: string, protected _options: TheronOptions) {
    super({ url });

    Object.assign(this._config, {
      onOpen: {
        next: (event) => { this._options.onConnect && this._options.onConnect.next(event) }
      },

      onClose: {
        next: (event) => { this._options.onDisconnect && this._options.onDisconnect.next(event) }
      },

      aroundUnbuffer: {
        next: this._connect
      },
    });
  }

  disconnect = () => {
    window.removeEventListener('beforeunload', this.disconnect);

    if (!this.isConnected()) {
      return;
    }

    this._toRequest(DISCONNECT).subscribe(req => {
      this.next(req);
    });

    this.complete();
  }

  setAuth(auth: TheronAuthOptions = {}) {
    this._auth = auth;
  }

  isConnected(): boolean {
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

  request<T>(type: string, data?: any, options?: TheronRescueOptions): Observable<TheronTransport<T>> {
    options = Object.assign({ retry: true }, options);

    let req = this._toRequest(type, data).do(req => this.next(req)).mergeMap(req => this.first(res => res.id === req.id).mergeMap(res =>
      res.type === ERROR ? Observable.throw({ code: res.code, reason: res.reason }) : Observable.of(res)
    ));

    if (options.retry === true) {
      req = this._toRescueObservable(req);
    }

    return req.publishLast().refCount();
  }

  publish<T>(channel: string, payload?: any, options?: TheronRescueOptions): Observable<TheronTransport<T>> {
    return this.request(PUBLISH, { channel, payload, secret: this._options.secret }, options);
  }

  join<T>(channel: string, options?: TheronRescueOptions & TheronSecureOptions & { onSubscribe?: NextObserver<any>, onUnsubscribe?: NextObserver<any> }): Observable<TheronTransport<T>> {
    options = Object.assign({ retry: true }, options);

    let req = new Observable(observer => {
      const subscription = new Subscription();

      // Fetch a signature form the endpoint or return an empty signature.

      if (options.sign) {
        var sign = this._fetchSignature(options.sign, { channel });
      } else {
        var sign = Observable.of('');
      }

      // Register the subscription on the server and receive an internal channel name.

      const token: Observable<any> = sign.mergeMap(signature =>
        this.request(SUBSCRIBE, { channel, signature }, { retry: false })
      ).publishLast().refCount();

      // Hook subscribe / unsubscribe events.

      subscription.add(
        token.onErrorResumeNext<any>().subscribe(({ channel }) => {
          options.onSubscribe && options.onSubscribe.next({ channel })
        })
      );

      subscription.add(
        () => token.onErrorResumeNext<any>().subscribe(({ channel, token }) => {
          options.onUnsubscribe && options.onUnsubscribe.next({ channel });

          if (this.isConnected()) {
            this._toRequest(UNSUBSCRIBE, { channel, token }).subscribe(req => this.next(req));
          }
        })
      );

      // Pong the ping request.

      subscription.add(
        token.mergeMap(({ token }) => this.filter(ping => ping.type === PING && ping.token === token)).onErrorResumeNext<any>().subscribe(({ token }) =>
          this.next({ type: PONG, token })
        )
      );

      // Filter the channel messages from the main queue.

      subscription.add(
        token.mergeMap(({ token, channel }) => this.filter(message => message.token === token || message.channel === channel)).subscribe(observer)
      );

      return subscription;
    });

    if (options.retry === true) {
      req = this._toRescueObservable(req);
    }

    return req.share();
  }

  watch<T>(endpoint: string, params?: any): Observable<T> {
    return null;
    //const checkStatus = (response) => {
    //  if (response.status >= 200 && response.status < 300) {
    //    return response;
    //  }

    //  const error = new Error(response.statusText);
    //  throw error;
    //}

    //const parseJson = (response) => {
    //  return response.json()
    //}

    //return new Observable<T>(observer => {
    //  var subscription;

    //  const resourceUrl = `${endpoint}?${qs.stringify(Object.assign({}, params, this._auth.params))}`

    //  fetch(resourceUrl, { headers: this._auth.headers }).then(checkStatus).then(parseJson).then(query => {
    //    let subscribeRequest = this._constructRequest({
    //      type: SUBSCRIBE_QUERY, payload: query
    //    });

    //    let unsubscribeRequest = null;

    //    subscription = this.multiplex(() => subscribeRequest, () => unsubscribeRequest, message => message.id === subscribeRequest.id).subscribe(
    //      message => {
    //        switch (message.type) {
    //          case REQUEST_SUCCESS:
    //            let queryId = message.payload.queryId;

    //            unsubscribeRequest = this._constructRequest({
    //              type: UNSUBSCRIBE_QUERY, payload: { queryId }
    //            });

    //            observer.next(message);

    //            this._cache.filter(action => action.id === queryId).subscribe(observer);
    //            break;

    //          case REQUEST_FAILURE:
    //            observer.error(message);
    //            break;
    //        }
    //      },

    //      error => {
    //        observer.error(error);
    //      },

    //      () => {
    //        observer.error('Request was suspended');
    //      }
    //    );
    //  }).catch(error => observer.error(error));

    //  return () => {
    //    subscription && subscription.unsubscribe();
    //  }
    //});
  }

  protected _connect = () => {
    this._toRequest(CONNECT, { app: this._options.app, secret: this._options.secret }).subscribe(req => {
      this.next(req);
    });

    window.addEventListener('beforeunload', this.disconnect);
 }

  protected _canRetry(err) {
    if (err.code >= 4000 && err.code < 4100) {
      throw err;
    }
  }

  protected _fetchSignature(url, params: any): Observable<string> {
    return Observable.ajax.post<any>(url, this._toParams(params), this._toHeaders()).map<string>(({ response }) => response.signature);
  }

  protected _toRescueObservable<T>(observable: Observable<T>): Observable<T> {
    let attemp = 0; // TODO: Get rid of the mutable state once the #1413 RxJS issue is closed.

    return observable.retryWhen(errs =>
      errs.do(this._canRetry).switchMap(() => Observable.timer(Math.pow(2, attemp + 1) * 500).do(() => attemp++))
    ).do(() => attemp = 0);
  }

  protected _toRequest<T>(type: string, req?: any): Observable<TheronTransport<T>> {
    return Observable.of(Object.assign({}, req, { type, id: uuid() }));
  }

  protected _toParams(params?: any): any {
    return Object.assign({}, this._auth.params, params);
  }

  protected _toHeaders(headers?: any): any {
    return Object.assign({}, this._auth.headers, headers, { 'Content-Type': 'application/json' });
  }
}
