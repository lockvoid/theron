import * as pg from 'pg';

import { Observable } from 'rxjs/Observable';
import { Subscription, TeardownLogic } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';
import { NextObserver } from 'rxjs/Observer';

export class DatabaseWatcher extends Observable<any> {
  constructor(protected _client: pg.Client, protected _onReady?: NextObserver<void>) {
    super();
  }

  protected _subscribe(subscriber: Subscriber<any>): TeardownLogic {
    this._client.on('notification', message => {
      if (message.channel !== 'theron_watchers') {
        return;
      }

      subscriber.next(message.payload.split(','));
    });

    this._client.on('error', err => {
      subscriber.error(err)
    });

    this._client.on('end', err => {
      subscriber.complete();
    });

    this._client.query('LISTEN theron_watchers', err => {
      if (err) {
        return subscriber.error(err);
      }

      this._onReady && this._onReady.next(null);
    });
  }
}
