import { TheronAction, TheronRequest } from '../../lib/action';
import { REQUEST_SUCCESS, REQUEST_FAILURE, DISPATCH_QUERY, UPSERT_QUERY, REMOVE_QUERY } from '../../lib/constants';
import { TheronExecutable } from '../../lib/executable';
import { WebSocketSubject } from '../../lib/websocket';

import * as WebSocket from 'ws';

export class Router extends WebSocketSubject<TheronRequest<any>> {
  constructor(socket: WebSocket) {
    super(socket);

    this.subscribe(message => {
      switch (message.type) {
        case UPSERT_QUERY:
          this._upsertQuery(message);
          break;

        case REMOVE_QUERY:
          this._removeQuery(message);
          break;

        case DISPATCH_QUERY:
          this._dispatch(message);
          break;
      }
    });
  }

  protected _upsertQuery<T>(request: TheronRequest<T>) {
    this.next({ id: request.id, type: REQUEST_SUCCESS, payload: request.payload });
  }

  protected _removeQuery<T>(request: TheronRequest<T>) {
    this.next({ id: request.id, type: REQUEST_SUCCESS, payload: request.payload });
  }

  protected _dispatch<T>(request: TheronRequest<T>) {
    this.next({ id: request.id, type: REQUEST_SUCCESS, payload: request.payload });
  }
}
