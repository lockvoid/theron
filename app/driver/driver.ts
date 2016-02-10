import { Observable } from 'rxjs/Observable';

import { TheronQueryAction } from '../../lib/actions';
import { TheronQueryObservable } from './query_observable';
import { SocketManager } from './socket_manager';

export class Theron {
  protected _socketManager: SocketManager<any>;

  constructor(url: string) {
    this._socketManager = new SocketManager(url);
    this._socketManager.subscribe(this._cacheAction.bind(this), this._tryConnect.bind(this));
  }

  query<T>(options: TheronQueryAction): TheronQueryObservable<T> {
    return new TheronQueryObservable(this._socketManager, options);
  }

  protected _cacheAction(action) {
  }

  protected _tryConnect() {
  }
}
