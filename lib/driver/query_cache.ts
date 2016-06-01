import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { TeardownLogic } from 'rxjs/Subscription';
import { OrderedMap } from 'immutable';
import { BaseRow } from '../core/base_row';
import { ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED, BEGIN_TRANSACTION, COMMIT_TRANSACTION, ROLLBACK_TRANSACTION } from '../core/constants/actions';

export class QueryCache extends Observable<BaseRow & { type: string, channel: string, token: string }> {
  protected _state: OrderedMap<string, any>;

  constructor(protected _socket) {
    super();
    this._state = OrderedMap<string, BaseRow>();
  }

  protected _cache(action: any) {
    if (action.type === ROW_MOVED || action.type === ROW_REMOVED) {
      action.payload = { row: this._state.get(`${action.channel}:${action.payload.rowId}`).payload.row, prevRowId: action.payload.prevRowId }
    }

    const { channel, payload } = action;

    switch (action.type) {
      case ROW_ADDED: case ROW_CHANGED: case ROW_MOVED:
        this._state = this._state.set(`${channel}:${payload.row.id}`, Object.assign({}, action, { type: ROW_ADDED }));
        break;
      case ROW_REMOVED:
        this._state = this._state.delete(`${channel}:${payload.row.id}`);
        break;
      case BEGIN_TRANSACTION:
        this._state = this._state.set(`${channel}:${action.type}`, action).delete(`${channel}:${COMMIT_TRANSACTION}`);
        break;
      case COMMIT_TRANSACTION:
        this._state = this._state.set(`${channel}:${action.type}`, action);
        break;
    }

    return action;
  }

  protected _clear() {
    this._state = this._state.clear();
  }

  protected _subscribe(subscriber: Subscriber<BaseRow>): TeardownLogic {
    //this._state.forEach(action => {
    //  if (subscriber.isUnsubscribed) {
    //    return false;
    //  }

    //  subscriber.next(action);
    //});

    return this._socket.map(action => this._cache(action)).do(() => {}, () => this._clear()).subscribe(subscriber);
  }
}
