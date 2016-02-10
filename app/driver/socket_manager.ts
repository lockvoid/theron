import { WebSocketSubject } from 'rxjs/observable/dom/webSocket';

import { TheronBaseAction } from '../../lib/base_action';

export class SocketManager<T extends TheronBaseAction> extends WebSocketSubject<T> {
  protected _next(action: TheronBaseAction): void {
    super._next(<any>this._stringifyAction(action));
  }

  protected _stringifyAction(action: TheronBaseAction): string {
    return JSON.stringify(action);
  }
};
