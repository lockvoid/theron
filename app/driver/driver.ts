import { Observable } from 'rxjs/Observable';

import { SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, REQUEST_SUCCESS, REQUEST_FAILURE, ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED } from '../../lib/constants';
import { TheronOptions, TheronAuthOptions } from '../../lib/options';
import { uuid } from '../../lib/utils/uuid';
import { RescueWebSocketSubject } from '../../lib/websocket';

export class Theron extends RescueWebSocketSubject<any> {
  protected _auth: TheronAuthOptions;

  constructor(url: string, options: TheronOptions) {
    super(`${url}?app=${options.app}`);

    this._auth = options.auth;

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
    return null;
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
