import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Map } from 'immutable';

import { BaseRow } from './base_row';
import { OrderedCache } from './ordered_cache';
import { EXECUTE_QUERY, ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED } from '../../lib/constants';

export class QueryDiff extends Subject<any> {
  protected _cache = Map<string, OrderedCache<any>>();

  constructor(protected _client) {
    super();

    this.destination = Subscriber.create<any>(message => {
      switch (message.type) {
        case EXECUTE_QUERY:
          return this._executeQuery(message.queryId, message.queryText);
      }
    });
  }

  protected async _executeQuery(queryId: string, queryText: string) {
    try {
      let currRows = new OrderedCache(await this._client.any(queryText));
      let prevRows = this._cache.get(queryId, new OrderedCache([]));

      currRows.rows.forEach((row, offset) => {
        let payload = {
          row, prevRowId: this._prevRowId(currRows, offset)
        };

        let prevOffset = prevRows.offset(row.id);

        if (prevOffset === undefined) {
          this._finalNext({ type: ROW_ADDED, payload });
          return true;
        }

        if (row.updated_at.getTime() !== prevRows.rows[prevOffset].updated_at.getTime()) {
          this._finalNext({ type: ROW_CHANGED, payload });
          return true;
        }

        if (prevOffset !== offset) {
          this._finalNext({ type: ROW_MOVED, payload });
          return true;
        }
      });

      prevRows.rows.forEach((row, offset) => {
        let currOffset = currRows.offset(row.id);

        if (currOffset === undefined) {
          this._finalNext({ type: ROW_REMOVED, payload: { row } });
          return true;
        }
      });

      this._cache = this._cache.set(queryId, currRows);
    } catch (error) {

    }
  }

  protected _prevRowId(rows: OrderedCache<any>, offset: number): number {
    let prevRow = rows.rows[offset - 1];

    if (prevRow) {
      return prevRow.id;
    } else {
      return null;
    }
  }
}
