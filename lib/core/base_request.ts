import { AliveWebSocket } from './alive_websocket';
import { BaseAction } from './base_action';

export interface BaseRequest extends BaseAction {
  app: { id: number, secret: string, development: boolean };
  socket: AliveWebSocket;
};
