import * as qs from 'qs';

import { PartialObserver } from 'rxjs/Observer';
import { Observable } from 'rxjs/Observable';
import { RescueWebSocketSubject } from '../websocket';
import { Cache } from './cache';
import { uuid } from './uuid';
import { hmac } from './sha256';
import { CONNECT, DISCONNECT, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH, SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, REQUEST_SUCCESS, REQUEST_FAILURE } from '../constants';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/publishLast';

export * from '../constants';

export interface TheronOptions { app: string; secret?: string; connectObserver?: PartialObserver<any>, disconnectObserver?: PartialObserver<any> }

export interface TheronAuthOptions { headers?: any; params?: any; }

export interface TheronJoinOptions { sign?: string; subscribeObserver?: PartialObserver<any>, unsubscribeObserver?: PartialObserver<any> }

export type TheronRequest<T> = T & { type: string, id: string }

export type TheronResponse<T> = T & { type: string, id: string }

export class Theron extends RescueWebSocketSubject<any> {
  protected _cache = new Cache();
  protected _auth: TheronAuthOptions = {};

  static sign(data: string = '', secret: string = ''): string {
    return hmac(secret, data);
  }

  constructor(url: string, protected _options: TheronOptions) {
    super(url);

    this._connect();

    // this.subscribe(this._cache);
  }

  disconnect = () => {
    window.removeEventListener('beforeunload', this.disconnect);

    if (this._isWebSocketHot()) {
      const req = this.request(DISCONNECT);

      if (this._options.disconnectObserver) {
        req.subscribe(this._options.disconnectObserver);
      }

      this.complete();
    }
  }

  protected _connect() {
    const req = this.request(CONNECT, { app: this._options.app, secret: this._options.secret });

    if (this._options.connectObserver) {
      req.subscribe(this._options.connectObserver);
    }

    window.addEventListener('beforeunload', this.disconnect);
  }

  setAuth(auth: TheronAuthOptions = {}) {
    this._auth = auth;
  }

  request<T>(type: string, data?: any): Observable<TheronResponse<T>> {
    let res = Observable.create(observer => {
      const req = this._request(type, data);

      this.first(res => res.id === req.id).mergeMap(res =>
        res.type === ERROR ? Observable.throw({ code: res.code, reason: res.reason }) : Observable.of(res)
      ).subscribe(observer);

      this.next(req);
    });

    res = res.publishLast(); res.connect();

    return res;
  }

  publish<T>(channel: string, payload?: any): Observable<TheronResponse<T>> {
    return this.request(PUBLISH, { channel, payload });
  }

  join<T>(channel: string, options: TheronJoinOptions = {}): Observable<TheronResponse<T>> {
    return new Observable(observer => {
      if (options.sign) {
        var sign = Observable.ajax.post<any>(options.sign, this._params({ channel }), this._auth.headers).map<string>(({ response }) => response.signature);
      } else {
        var sign = Observable.of('');
      }

      let req = sign.mergeMap(signature => this.request<any>(SUBSCRIBE, { channel, signature }));

      if (options.subscribeObserver) {
        req.subscribe(options.subscribeObserver);
      }

      req.mergeMap(res => this.filter(message => message.channel === res.channel)).subscribe(observer);

      return () => {
        /*
        let req = this.request(UNSUBSCRIBE, { channel: 'before disc' });

        req.subscribe(
          res => {
            let req = this.request(UNSUBSCRIBE, { channel: res.channel });

            if (options.unsubscribeObserver) {
              req.subscribe(options.unsubscribeObserver);
            }
          },

          err => {
            // TODO: Switch to OnErrorResumeNext once RxJS beta.8 is landed.
          }
        ); */
      }
    });
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

  protected _request<T>(type: string, req?: any): TheronRequest<T> {
    return Object.assign({}, req, { type, id: uuid() });
  }

  protected _params(data: any): any {
    return Object.assign({}, this._auth.params, data);
  }
}
