import { WebSocketSubject } from 'rxjs/observable/dom/webSocket';

import { BaseAction } from '../../lib/base_action';

export class Theron {
  protected ws: WebSocketSubject<BaseAction>;

  constructor(url: string) {
    this.ws = new WebSocketSubject(url);
    this.ws.subscribe(this.cacheAction.bind(this), this.tryConnect.bind(this));
  }

  protected cacheAction() {
  }

  protected tryConnect() {
  }
}
