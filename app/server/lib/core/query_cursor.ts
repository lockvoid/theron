import * as pg from 'pg';

import { Observable } from 'rxjs/Observable';
import { TeardownLogic } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';

const Cursor = require('pg-cursor');

export class QueryCursor<T> extends Observable<T> {
  constructor(protected _databaseUrl: string, protected _query: string, protected _batchSize: number) {
    super();
  }

  protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
    pg.connect(this._databaseUrl, async (err, client, done) => {
      if (subscriber.isUnsubscribed) {
        return done();
      }

      const cursor = client.query(new Cursor(this._query));

      while (true) {
        try {
          var rows = await new Promise<T[]>((resolve, reject) => {
            (<any>cursor).read(this._batchSize, (err, res) => err ? reject(err) : resolve(res));
          });
        } catch (err) {
          done(); subscriber.error(err);
          break;
        }

        if (subscriber.isUnsubscribed) {
          done();
          break;
        }

        if (!rows.length) {
          done(); subscriber.complete();
          break;
        }

        rows.forEach(row => subscriber.next(row));
      }
    });
  }
}
