import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { AnonymousSubscription } from 'rxjs/Subscription';
import { OrderedMap } from 'immutable';

import { ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED, BEGIN_TRANSACTION, COMMIT_TRANSACTION, ROLLBACK_TRANSACTION } from '../constants';

export class ReplayCache extends Subject<any> {
  protected _cache = OrderedMap<string, any>();

  protected _next(action) {
    const { id, payload } = action;

    switch (action.type) {
      case ROW_ADDED: case ROW_CHANGED: case ROW_MOVED:
        this._cache = this._cache.set(`${id}:${payload.row.id}`, Object.assign({}, action, { type: ROW_ADDED }));
        break;
      case ROW_REMOVED:
        this._cache = this._cache.delete(`${id}:${payload.row.id}`);
        break;
      case BEGIN_TRANSACTION:
        this._cache = this._cache.set(`${id}:${action.type}`, action).delete(`${id}:${COMMIT_TRANSACTION}`);
        break;
      case COMMIT_TRANSACTION:
        this._cache = this._cache.set(`${id}:${action.type}`, action);
        break;
    }

    super._next(action);
  }

  protected _subscribe(subscriber: Subscriber<any>): AnonymousSubscription | Function | void {
    this._cache.forEach(action => {
      if (subscriber.isUnsubscribed) {
        return false;
      }

      subscriber.next(action);
    });

    return super._subscribe(subscriber);
  }
}
