import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/subject/BehaviorSubject';

import { REQUEST_SUCCESS, REQUEST_FAILURE, DISPATCH_QUERY, UPSERT_QUERY, REMOVE_QUERY } from '../../lib/constants';
import { TheronAction } from '../../lib/action';
import { TheronOptions } from '../../lib/options';
import { TheronExecutable } from '../../lib/executable';
import { RescueWebSocketSubject } from '../../lib/websocket';
import { uuid } from '../../lib/utils/uuid';

export class Theron extends RescueWebSocketSubject<TheronAction> {
  protected _auth: BehaviorSubject<any>;

  constructor(url: string, options: TheronOptions) {
    super(url);
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
    return null;
  }

  removeQuery(name: string): Observable<any> {
    return null;
  }

  dispatch(name: string, params?: any): Observable<any> {
    return null;
  }

  watch<T>(name: string, params?: any): Observable<T> {
    return null;
  }

  /*
  upsertQuery(name: string, dispatchable: TheronDispatchable): Observable<any> {
    setTimeout(() => {
      this._socket.next({ type: UPSERT_QUERY, name, dispatchable: dispatchable.toString() });
    });

    return new Observable(observer => {
      let subscription = this._socket.filter(action => action.origin === UPSERT_QUERY && action.name === name).subscribe(action => {
        switch (action.type) {
          case REQUEST_SUCCESS:
            return observer.complete();
          case REQUEST_FAILURE:
            return observer.error(action.reason);
        }
      });

      return () => {
        subscription.unsubscribe();
      }
    });
  }

  removeQuery(name: string): Observable<any> {
    setTimeout(() => {
      this._socket.next({ type: REMOVE_QUERY, name });
    });

    return new Observable(observer => {
      let subscription = this._socket.filter(action => action.origin === REMOVE_QUERY && action.name === name).subscribe(action => {
        switch (action.type) {
          case REQUEST_SUCCESS:
            return observer.complete();
          case REQUEST_FAILURE:
            return observer.error(action.reason);
        }
      });

      return () => {
        subscription.unsubscribe();
      }
    });
  }

  dispatch(name: string, params?: any): Observable<any> {
    const requestId = uuid();

    setTimeout(() => {
      this._socket.next({ type: DISPATCH_QUERY, requestId, name, params });
    });

    return new Observable(observer => {
      let subscription = this._socket.filter(action => action.origin === DISPATCH_QUERY && action.requestId === requestId).subscribe(action => {
        switch (action.type) {
          case REQUEST_SUCCESS:
            return observer.complete();
          case REQUEST_FAILURE:
            return observer.error(action.reason);
        }
      });

      return () => {
        subscription.unsubscribe();
      }
    });
  }


  protected _processAction(action) {
    this._dataManager.next(action);
  }

  protected _reconnect(err) {
  }
  */
}
