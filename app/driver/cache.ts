import { Map } from 'immutable';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';

import { TheronRequest } from '../../lib/action';
import { ROW_ADDED, ROW_UPDATED, ROW_REMOVED, ROWS_READY, PURGE_ROWS } from '../../lib/constants';

const pristine = Map<string, TheronRequest<any>>();

export class Cache extends Subject<TheronRequest<any>> {
  protected _cache = Map<string, Map<string, TheronRequest<any>>>();
  protected _ready = Map<string, TheronRequest<any>>();

  protected _next(action: TheronRequest<any>) {
    switch (action.type) {
      case ROW_ADDED: case ROW_UPDATED:
        this._cache = this._cache.set(action.id, this._cache.get(action.id, pristine).set(action.payload.row.id, action));
        break;
      case ROW_REMOVED:
        this._cache = this._cache.set(action.id, this._cache.get(action.id, pristine).delete(action.payload.row.id));
        break;
      case ROWS_READY:
        this._ready = this._ready.set(action.id, action);
        break;
      case PURGE_ROWS:
        this._cache = this._cache.delete(action.id);
        this._ready = this._ready.delete(action.id);
        break;
      default:
        return false;
    }

    super._next(action);
  }

  protected _subscribe(subscriber: Subscriber<TheronRequest<any>>): Subscription | Function | void {
    this._cache.forEach(query => {
      query.forEach(action => {
        subscriber.next(action);
      });
    });

    this._ready.forEach(action => {
      subscriber.next(action);
    });

    return super._subscribe(subscriber);
  }
}
