import { TheronAction, TheronRequest } from '../../lib/action';
import { TheronExecutable } from '../../lib/executable';
import { WebSocketSubject } from '../../lib/websocket';

import {
  REQUEST_SUCCESS,
  REQUEST_FAILURE,
  DISPATCH_QUERY,
  UPSERT_QUERY,
  REMOVE_QUERY,
  SUBSCRIBE_QUERY,
  UNSUBSCRIBE_QUERY,
  ROW_ADDED,
  ROW_UPDATED,
  ROW_REMOVED
} from '../../lib/constants';

import * as WebSocket from 'ws';

export class Router extends WebSocketSubject<TheronRequest<any>> {
  constructor(socket: WebSocket) {
    super(socket);

    this.subscribe(
      message => {
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

          case SUBSCRIBE_QUERY:
            this._subscribeQuery(message);
            break;

          case UNSUBSCRIBE_QUERY:
            this._unsubscribeQuery(message);
            break;
        }
      },

      error => {
      }
    );
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

  sub = false;

  protected _subscribeQuery<T>(request: TheronRequest<T>) {
    this.next({ id: request.id, type: REQUEST_SUCCESS, payload: { queryId: 'someid' } });

    if (!this.sub) {
      this.sub = true;
      setTimeout(() => {
      this.next({ id: 'someid', type: ROW_ADDED, payload: { row: { id: '1', name: 'name' }, offset: 1 } });
      this.next({ id: 'someid', type: ROW_ADDED, payload: { row: { id: '2', name: 'name' }, offset: 2 } });
      this.next({ id: 'someid', type: ROW_ADDED, payload: { row: { id: '3', name: 'name' }, offset: 3 } });
    }, 200);
    }
  }

  protected _unsubscribeQuery<T>(request: TheronRequest<T>) {
    console.log('unsubed');
  }
}
