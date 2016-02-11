import { Observable } from 'rxjs/Observable';

import { TheronBaseAction, TheronDataAction, TheronQueryAction } from '../../lib/actions';
import { TheronQueryObservable } from './query_observable';
import { DataManager } from './data_manager';
import { SocketManager } from './socket_manager';

export class Theron {
  protected _dataManager = new DataManager<TheronDataAction<any>>();
  protected _socketManager: SocketManager<TheronBaseAction>;

  constructor(url: string) {
    this._socketManager = new SocketManager(url);
    this._socketManager.subscribe(this._processAction.bind(this), this._tryConnect.bind(this));
  }

  query<T>(options: TheronQueryAction): TheronQueryObservable<T> {
    return new TheronQueryObservable(this._socketManager, this._dataManager, options);
  }

  protected _processAction(action) {
    this._dataManager.next(action);
  }

  protected _tryConnect() {
  }
}
