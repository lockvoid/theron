import { Observable } from 'rxjs/Observable';

import { REQUEST_SUCCESS, REQUEST_FAILURE, DISPATCH_QUERY, UPSERT_QUERY, REMOVE_QUERY, QUERY_REMOVED } from '../../lib/constants';
import { TheronBaseAction, TheronDataAction, TheronQueryAction } from '../../lib/actions';
import { TheronDispatchable } from '../../lib/dispatchable';
import { TheronWatcher } from './watcher';
import { DataManager } from './data_manager';
import { SocketManager } from './socket_manager';
import { uuid } from '../../lib/utils/uuid';

import * as qs from 'qs';

import 'rxjs/add/operator/toPromise';

export interface TheronOptions {
  app: string;
  secret?: string;
}

export class Theron {
  protected _dataManager = new DataManager<TheronDataAction<any>>();
  protected _socketManager: SocketManager<any>;

  constructor(url: string, options: TheronOptions) {
    this._socketManager = new SocketManager(this._constructUrl(url, options));
    this._socketManager.subscribe(this._processAction.bind(this), this._reconnect.bind(this));
  }

  upsertQuery(name: string, dispatchable: TheronDispatchable): Observable<any> {
    setTimeout(() => {
      this._socketManager.next({ type: UPSERT_QUERY, name, dispatchable: dispatchable.toString() });
    });

    return new Observable(observer => {
      let subscription = this._socketManager.filter(action => action.origin === UPSERT_QUERY && action.name === name).subscribe(action => {
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
      this._socketManager.next({ type: REMOVE_QUERY, name });
    });

    return new Observable(observer => {
      let subscription = this._socketManager.filter(action => action.origin === REMOVE_QUERY && action.name === name).subscribe(action => {
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
      this._socketManager.next({ type: DISPATCH_QUERY, requestId, name, params });
    });

    return new Observable(observer => {
      let subscription = this._socketManager.filter(action => action.origin === DISPATCH_QUERY && action.requestId === requestId).subscribe(action => {
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

  watch<T>(queryName: string, queryParams?: any): TheronWatcher<T> {
    return new TheronWatcher(this._socketManager, this._dataManager, queryName, queryParams);
  }

  protected _processAction(action) {
    this._dataManager.next(action);
  }

  protected _reconnect(err) {
  }

  protected _constructUrl(url: string, options: TheronOptions): string {
    return [url, qs.stringify(options)].join('?');
  }
}
