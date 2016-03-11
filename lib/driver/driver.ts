import { Observable } from 'rxjs/Observable';

import { SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, REQUEST_SUCCESS, REQUEST_FAILURE } from '../constants';
import { ReplayCache } from './replay_cache';
import { RescueWebSocketSubject } from '../websocket';
import { uuid } from './uuid';
import { hmac } from './sha256';

import './fetch';

import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/scan';

import * as qs from 'qs';

export * from '../constants';

export interface TheronAuth {
  headers?: any;
  params?: any;
}

export interface TheronOptions {
  app: string;
  secret?: string;
}

export class Theron extends RescueWebSocketSubject<any> {
  protected _cache = new ReplayCache();

  protected _options: TheronOptions;
  protected _auth: TheronAuth;

  static sign(queryText: string, secretKey: string): string {
    return hmac(secretKey, queryText);
  }

  static prefixAction(action, queryName: string) {
    return Object.assign({}, action, { type: Theron.prefixActionType(action.type, queryName) })
  }

  static prefixActionType(actionType: string, queryName: string): string {
    return `${queryName.toUpperCase()}:${actionType}`;
  }

  constructor(url: string, options: TheronOptions) {
    super(`${url}?app=${options.app}`);

    this.setAuth();
    this.subscribe(this._cache);

    this._options = Object.assign({}, this._options, options);
  }

  setAuth(auth: TheronAuth = {}) {
    this._auth = Object.assign({}, this._auth, auth);
  }

  watch<T>(endpoint: string, params?: any): Observable<T> {
    const checkStatus = (response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }

      const error = new Error(response.statusText);
      throw error;
    }

    const parseJson = (response) => {
      return response.json()
    }

    return new Observable<T>(observer => {
      var subscription;

      const resourceUrl = `${endpoint}?${qs.stringify(Object.assign({}, params, this._auth.params))}`

      fetch(resourceUrl, { headers: this._auth.headers }).then(checkStatus).then(parseJson).then(query => {
        let subscribeRequest = this._constructRequest({
          type: SUBSCRIBE_QUERY, payload: query
        });

        let unsubscribeRequest = null;

        subscription = this.multiplex(() => subscribeRequest, () => unsubscribeRequest, message => message.id === subscribeRequest.id).subscribe(
          message => {
            switch (message.type) {
              case REQUEST_SUCCESS:
                let queryId = message.payload.queryId;

                unsubscribeRequest = this._constructRequest({
                  type: UNSUBSCRIBE_QUERY, payload: { queryId }
                });

                observer.next(message);

                this._cache.filter(action => action.id === queryId).subscribe(observer);
                break;

              case REQUEST_FAILURE:
                observer.error(message);
                break;
            }
          },

          error => {
            observer.error(error);
          },

          () => {
            observer.error('Request was suspended');
          }
        );
      }).catch(error => observer.error(error));

      return () => {
        subscription && subscription.unsubscribe();
      }
    });
  }

  sign(queryText: string) {
    return Theron.sign(queryText, this._options.secret);
  }

  protected _constructRequest(action) {
    return Object.assign({}, action, { id: uuid() });
  }

  // upsertQuery(name: string, executable: TheronExecutable): Observable<any> {
  //   return this._request({ type: UPSERT_QUERY, payload: { name, executable: executable.toString() } });
  // }

  // removeQuery(name: string): Observable<any> {
  //   return this._request({ type: REMOVE_QUERY, payload: { name } });
  // }

  // dispatch(name: string, params?: any): Observable<any> {
  //   return this._request({ type: DISPATCH_QUERY, payload: { name, params } });
  // }

  // watch<T>(name: string, params?: any): Observable<T> {
  //   return new Observable(observer => {
  //     let subscribeMessage = this._constructRequest({ type: SUBSCRIBE_QUERY, payload: { name, params } });
  //     let unsubscribeMessage = this._constructRequest({ type: UNSUBSCRIBE_QUERY, payload: { name, params } });

  //     let subscription = this.multiplex(() => subscribeMessage, () => unsubscribeMessage, message => message.id === subscribeMessage.id).subscribe(
  //       message => {
  //         switch (message.type) {
  //           case REQUEST_SUCCESS:
  //             observer.next(message);
////               this._cache.filter(action => action.id = message.payload.queryId).subscribe(observer);
  //             break;

  //           case REQUEST_FAILURE:
  //             observer.error(message);
  //             break;
  //         }
  //       },

  //       error => {
  //         observer.error(error);
  //       },

  //       () => {
  //         observer.error('Request was suspended');
  //       }
  //     );

  //     return () => {
  //       subscription.unsubscribe();
  //     }
  //   });
  // }

  // protected _request<T>(action: TheronAction<T>): Observable<TheronRequest<T>> {
  //   let request = this._constructRequest(action);

  //   return new Observable(observer => {
  //     let subscription = this.multiplex(() => request, null, message => message.id === request.id).subscribe(
  //       message => {
  //         switch (message.type) {
  //           case REQUEST_SUCCESS:
  //             observer.next(message); observer.complete();
  //             break;

  //           case REQUEST_FAILURE:
  //             observer.error(message);
  //             break;
  //         }
  //       },

  //       error => {
  //         observer.error(error);
  //       },

  //       () => {
  //         observer.error('Request was suspended');
  //       }
  //     );


  //     return () => {
  //       subscription.unsubscribe();
  //     }
  //   });
  // }

  // protected _constructRequest<T>(action: TheronAction<T>): TheronRequest<T> {
  //   return Object.assign({}, action, { id: uuid() });
  // }
}
