import { Observable } from 'rxjs/Observable';

import { SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, REQUEST_SUCCESS, REQUEST_FAILURE, ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED } from './constants';
import { TheronOptions, TheronAuthOptions } from './options';
import { uuid } from './utils/uuid';
import { RescueWebSocketSubject } from './websocket';

import * as qs from 'qs';
import 'whatwg-fetch';

export class Theron extends RescueWebSocketSubject<any> {
  constructor(url: string, options: TheronOptions) {
    super(`${url}?app=${options.app}`);

    this.subscribe(
      message => {
        console.log(message);
      },

      error => {
        console.log(error);
      }
    );
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

      fetch(`${endpoint}?${qs.stringify(params)}`).then(checkStatus).then(parseJson).then(query => {
        let subscribeRequest = this._constructRequest({
          type: SUBSCRIBE_QUERY, payload: query
        });

        let unsubscribeRequest = this._constructRequest({
          type: UNSUBSCRIBE_QUERY, payload: query
        });

        subscription = this.multiplex(() => subscribeRequest, () => unsubscribeRequest, message => message.id === subscribeRequest.id).subscribe(
          message => {
            switch (message.type) {
              case REQUEST_SUCCESS:
                observer.next(message);
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
