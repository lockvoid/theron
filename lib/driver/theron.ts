import * as qs from 'qs';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { NextObserver } from 'rxjs/Observer';
import { WebSocketSubject } from '../websocket';
import { QueryCache } from './query_cache';
import { TheronDataArtefact } from '../core/data_artefact';
import { TheronRowArtefact } from '../core/row_artefact';
import { BaseRow } from '../core/base_row';
import { BaseAction } from '../core/base_action';
import { TheronAppOptions } from './app_options';
import { TheronSecureOptions } from './secure_options';
import { TheronAuthOptions } from './auth_options';
import { TheronRescueOptions } from './rescue_options';
import { TheronAsideEffects } from './aside_effects';
import { CONNECT, DISCONNECT, PING, PONG, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH } from '../core/constants/actions';
import { uuid } from './uuid';
import { hmac } from './sha256';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/timer';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/concat';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/onErrorResumeNext';
import 'rxjs/add/operator/publishLast';
import 'rxjs/add/operator/retryWhen';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/switchMap';

export * from '../core/constants/actions';

export type TheronTransport<T> = T & BaseAction;

export class Theron extends WebSocketSubject<any> {
  protected _auth: TheronAuthOptions = {};
  protected _cache: QueryCache;

  static sign(data: string = '', secret: string = ''): string {
    return hmac(secret, data);
  }

  constructor(url: string, protected _options: TheronAppOptions) {
    super({ url: (url.startsWith('http') ? url.replace('http', 'ws') : url) });

    if (!this._options || !this._options.app) {
      throw 'App name is required';
    }

    Object.assign(this._config, {
      onOpen: {
        next: event => { this._options.onConnect && this._options.onConnect.next(event) }
      },

      onClose: {
        next: event => { this._options.onDisconnect && this._options.onDisconnect.next(event) }
      },

      aroundUnbuffer: {
        next: this._connect
      },
    });

    this._cache = new QueryCache(this);
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

  request<T, R>(type: string, data?: T, options?: TheronRescueOptions): Observable<TheronTransport<R>> {
    options = Object.assign({ retry: true }, options);

    let req = this._toRequest(type, data).do(req => this.next(req)).mergeMap(req => this.first(res => res.id === req.id).mergeMap(res =>
      res.type === ERROR ? Observable.throw({ code: res.code, reason: res.reason }) : Observable.of(res)
    ));

    if (options.retry === true) {
      req = this._toRescueObservable(req);
    }

    return req.publishLast().refCount();
  }

  publish<T>(channel: string, payload?: T, options?: TheronRescueOptions): Observable<TheronTransport<{}>> {
    return this.request(PUBLISH, { channel, payload, secret: this._options.secret }, options);
  }

  join<T>(channel: string, options?: TheronRescueOptions & TheronSecureOptions & TheronAsideEffects): Observable<TheronDataArtefact<T>> {
    options = Object.assign({ retry: true }, options);

    let req = new Observable(observer => {
      const subscription = new Subscription();

      // Fetch a signature form the endpoint or return an empty signature.

      if (options.sign) {
        var sign = this._fetchSignature(options.sign, { channel }).map<string>(res => res.signature);
      } else {
        var sign = Observable.of('');
      }

      // Register the subscription on the server and receive an internal channel name.

      const token: Observable<any> = sign.mergeMap(signature =>
        this.request(SUBSCRIBE, { channel, signature }, { retry: false })
      ).publishLast().refCount();

      // Hook subscribe / unsubscribe events.

      subscription.add(
        token.onErrorResumeNext<any>().subscribe(() => {
          options.onSubscribe && options.onSubscribe.next(null)
        })
      );

      subscription.add(
        () => token.onErrorResumeNext<any>().subscribe(({ token }) => {
          options.onUnsubscribe && options.onUnsubscribe.next(null);

          if (this.isConnected()) {
            this._toRequest(UNSUBSCRIBE, { token }).subscribe(req => this.next(req));
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
        token
          .mergeMap(({ token }) => this.filter(res => res.token ? res.token === token : res.channel === channel))
          .mergeMap(res => res.type === ERROR ? Observable.throw({ code: res.code, reason: res.reason }) : Observable.of(res)).subscribe(observer)
      );

      return subscription;
    });

    if (options.retry === true) {
      req = this._toRescueObservable(req);
    }

    return req.share();
  }

  watch<T extends BaseRow>(url: string, params?: any, options?: TheronRescueOptions & TheronAsideEffects): Observable<TheronRowArtefact<T>> {
    options = Object.assign({ retry: true }, options);

    let req = new Observable(observer => {
      const subscription = new Subscription();

      // Fetch a query and a signature form the endpoint or return an empty signature.

      const query = this._fetchQuery(url, params);

      // Register the subscription on the server and receive an internal channel name.

      const token: Observable<any> = query.mergeMap(({ query, signature }) =>
        this.request<any, { token: string, channel: string }>(SUBSCRIBE, { query, signature }, { retry: false })
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

      // Filter the channel messages from the cache.

      subscription.add(
        token
          .mergeMap(({ token, channel }) => this._cache.filter(res => res.token ? res.token === token : res.channel === channel))
          .mergeMap((res: any) => res.type === ERROR ? Observable.throw({ code: res.code, reason: res.reason }) : Observable.of(res)).subscribe(observer)
      );

      return subscription;
    });

    if (options.retry === true) {
      req = this._toRescueObservable(req);
    }

    return req.share();
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

  protected _fetchSignature(url, params: any): Observable<any> {
    return Observable.ajax.post<any>(url, this._toParams(params), this._toHeaders()).map(({ response }) => response);
  }

  protected _fetchQuery(url, params: any): Observable<any> {
    return Observable.ajax.get<any>(`${url}?${qs.stringify(this._toParams(params))}`, ({ response }) => response, this._toHeaders())
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
