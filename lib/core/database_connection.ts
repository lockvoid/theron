import * as pg from 'pg';

import { Observable } from 'rxjs/Observable';
import { Subscription, TeardownLogic } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';
import { BAD_REQUEST } from './constants/errors';

export class DatabaseConnection extends Observable<[pg.Client, (err) => void]> {
  constructor(protected _url: string) {
    super();
  }

  protected _subscribe(subscriber: Subscriber<[pg.Client, (err) => void]>): TeardownLogic {
    if (!this._url) {
      subscriber.error({ code: BAD_REQUEST, reason: 'No database credentials' });
    } else {
      const subscription = new Subscription();

      pg.connect(this._url, async (err, conn, done) => {
        if (subscriber.isUnsubscribed) {
          return done();
        }

        subscription.add(() => {
          done();
        });

        subscriber.next([conn, done]);
      });

      return subscription;
    }
  }
}

