import * as pg from 'pg';

import { Observable } from 'rxjs/Observable';
import { TeardownLogic } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';
import { BaseRow } from './base_row';

const Cursor = require('pg-cursor');

export interface CursorConfig {
  batchSize: number;
}

export class QueryCursor<T extends BaseRow> extends Observable<T> {
  protected _config: CursorConfig;

  constructor(protected _conn: pg.Client, protected _query: string, config?: CursorConfig) {
    super();

    this._config = Object.assign({ batchSize: 1000 }, config);
  }

  get query(): string {
    return this._query;
  }

  protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
    this._iterate(subscriber);
  }

  protected async _iterate(subscriber: Subscriber<T>) {
    const cursor = this._conn.query(new Cursor(this._query));

    while (true) {
      try {
        var rows = await new Promise<T[]>((resolve, reject) => {
          (<any>cursor).read(this._config.batchSize, (err, res) => err ? reject(err) : resolve(res));
        });
      } catch (err) {
        subscriber.error(err);
        break;
      }

      if (subscriber.isUnsubscribed) {
        break;
      }

      if (!rows.length) {
        subscriber.complete();
        break;
      }

      rows.forEach(row => subscriber.next(row));
    }
  }
}
