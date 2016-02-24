import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Map } from 'immutable';

import { BaseRow } from './base_row';
import { OffsetCache } from './offset_cache';
import { EXECUTE_QUERY, ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED, BEGIN_TRANSACTION, COMMIT_TRANSACTION, ROLLBACK_TRANSACTION } from '../../lib/constants';

export class QueryDiff extends Subject<any> {
  protected _cache = Map<string, OffsetCache<any>>();

  constructor(protected _client) {
    super();

    this.destination = Subscriber.create<any>(message => {
      switch (message.type) {
        case EXECUTE_QUERY:
          return this._executeQuery(message.payload.queryId, message.payload.queryText);
      }
    });
  }

  protected async _executeQuery(queryId: string, queryText: string) {
    try {
      this._finalNext({ id: queryId, type: BEGIN_TRANSACTION });

      let currRows = new OffsetCache(await this._client.any(queryText));
      let prevRows = this._cache.get(queryId, new OffsetCache([]));

      currRows.rows.forEach((row, offset) => {
        let payload = {
          row, prevRowId: this._prevRowId(currRows, offset)
        };

        let prevOffset = prevRows.offset(row.id);

        if (prevOffset === undefined) {
          this._finalNext({ id: queryId, type: ROW_ADDED, payload });
          return true;
        }

        if (row.updated_at.getTime() !== prevRows.rows[prevOffset].updated_at.getTime()) {
          this._finalNext({ id: queryId, type: ROW_CHANGED, payload });
          return true;
        }

        if (prevOffset !== offset) {
          this._finalNext({ id: queryId, type: ROW_MOVED, payload });
          return true;
        }
      });

      prevRows.rows.forEach((row, offset) => {
        let currOffset = currRows.offset(row.id);

        if (currOffset === undefined) {
          this._finalNext({ id: queryId, type: ROW_REMOVED, payload: { row } });
          return true;
        }
      });

      this._cache = this._cache.set(queryId, currRows);

      this._finalNext({ id: queryId, type: COMMIT_TRANSACTION });
    } catch (error) {

    }
  }

  protected _prevRowId(rows: OffsetCache<any>, offset: number): number {
    let prevRow = rows.rows[offset - 1];

    if (prevRow) {
      return prevRow.id;
    } else {
      return null;
    }
  }
}
