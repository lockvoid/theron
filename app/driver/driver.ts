import { BehaviorSubject } from 'rxjs/subject/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';

import { Cache } from './cache';
import { TheronAction, TheronRequest } from '../../lib/action';
import { TheronExecutable } from '../../lib/executable';
import { TheronOptions } from '../../lib/options';
import { uuid } from '../../lib/utils/uuid';
import { RescueWebSocketSubject } from '../../lib/websocket';

import {
  REQUEST_SUCCESS,
  REQUEST_FAILURE,
  DISPATCH_QUERY,
  UPSERT_QUERY,
  REMOVE_QUERY,
  SUBSCRIBE_QUERY,
  UNSUBSCRIBE_QUERY,
  ROW_ADDED,
  ROW_UPDATED,
  ROW_REMOVED
} from '../../lib/constants';

export class Theron extends RescueWebSocketSubject<TheronRequest<any>> {
  protected _auth: BehaviorSubject<any>;
  protected _cache: Cache = new Cache();

  constructor(url: string, options: TheronOptions) {
    super(url);

    this.subscribe(this._cache);

    this.subscribe(
      message => {
        console.log(message);
      },

      error => {
        console.log(error);
      }
    );
  }

  authWithToken(token: string): Observable<any> {
    return null;
  }

  authWithPassword(email: string, password: string): Observable<any> {
    return null;
  }

  get auth(): BehaviorSubject<any> {
    return this._auth;
  }

  upsertQuery(name: string, executable: TheronExecutable): Observable<any> {
    return this._request({ type: UPSERT_QUERY, payload: { name, executable: executable.toString() } });
  }

  removeQuery(name: string): Observable<any> {
    return this._request({ type: REMOVE_QUERY, payload: { name } });
  }

  dispatch(name: string, params?: any): Observable<any> {
    return this._request({ type: DISPATCH_QUERY, payload: { name, params } });
  }

  watch<T>(name: string, params?: any): Observable<T> {
    return new Observable(observer => {
      let subscribeMessage = this._constructRequest({ type: SUBSCRIBE_QUERY, payload: { name, params } });
      let unsubscribeMessage = this._constructRequest({ type: UNSUBSCRIBE_QUERY, payload: { name, params } });

      let subscription = this.multiplex(() => subscribeMessage, () => unsubscribeMessage, message => message.id === subscribeMessage.id).subscribe(
        message => {
          switch (message.type) {
            case REQUEST_SUCCESS:
              observer.next(message);
              this._cache.filter(action => action.id = message.payload.queryId).subscribe(observer);
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

      return () => {
        subscription.unsubscribe();
      }
    });
  }

  protected _request<T>(action: TheronAction<T>): Observable<TheronRequest<T>> {
    let request = this._constructRequest(action);

    return new Observable(observer => {
      let subscription = this.multiplex(() => request, null, message => message.id === request.id).subscribe(
        message => {
          switch (message.type) {
            case REQUEST_SUCCESS:
              observer.next(message); observer.complete();
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

      return () => {
        subscription.unsubscribe();
      }
    });
  }

  protected _constructRequest<T>(action: TheronAction<T>): TheronRequest<T> {
    return Object.assign({}, action, { id: uuid() });
  }
}
