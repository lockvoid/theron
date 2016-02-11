import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';
import { Map } from 'immutable';

import { ROW_CREATED, ROW_UPDATED, ROW_REMOVED, QUERY_READY } from '../../lib/constants';
import { TheronDataAction } from '../../lib/actions';

export class DataManager<T> extends Subject<TheronDataAction<T>> {
  protected _cache = Map<string, any>();
  protected _ready = Map<string, boolean>();

  /* protected */ _next(action: any) {
    switch (action.type) {
      case ROW_CREATED:
        this._cache = this._cache.set(action.snapshot.id, action);
        break;
      case ROW_UPDATED:
        this._cache = this._cache.set(action.snapshot.id, action);
        break;
      case ROW_REMOVED:
        this._cache = this._cache.delete(action.snapshot.id);
        break;
      case QUERY_READY:
        this._ready = this._ready.set(action.queryKey, true);
        break;
      default:
        return false;
    }

    super._next(action);
  }

  /* protected */ _subscribe(subscriber: Subscriber<any>): Subscription | Function | void {
    this._cache.forEach(action => {
      if (!subscriber.isUnsubscribed) {
        return false;
      }

      subscriber.next(action);
    });

    this._ready.forEach(action => {
      if (!subscriber.isUnsubscribed) {
        return false;
      }

      subscriber.next(action);
    });

    return super._subscribe(subscriber);
  }
}
