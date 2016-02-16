import { BehaviorSubject } from 'rxjs/subject/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';

import { TheronAction, TheronRequest } from '../../lib/action';
import { REQUEST_SUCCESS, REQUEST_FAILURE, DISPATCH_QUERY, UPSERT_QUERY, REMOVE_QUERY } from '../../lib/constants';
import { TheronExecutable } from '../../lib/executable';
import { TheronOptions } from '../../lib/options';
import { uuid } from '../../lib/utils/uuid';
import { RescueWebSocketSubject } from '../../lib/websocket';

export class Theron extends RescueWebSocketSubject<TheronRequest<any>> {
  protected _auth: BehaviorSubject<any>;

  constructor(url: string, options: TheronOptions) {
    super(url);

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
    return null;
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
