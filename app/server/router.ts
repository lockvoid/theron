import { WebSocketSubject } from '../../lib/websocket';
import { Map, List } from 'immutable';

import { SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, EXECUTE_QUERY, REQUEST_SUCCESS, REQUEST_FAILURE } from '../../lib/constants';
import { Theron } from '../../lib/driver/driver';
import { QueryParser } from './query_parser';
import { QueryDiff } from './query_diff';

import * as WebSocket from 'ws';

const emptyMap = Map();

export class Router extends WebSocketSubject<any> {
  protected _queries = Map<string, any>();
  protected _tables = Map<string, any>();
  protected _diff: QueryDiff;
  protected _aliveTimer: NodeJS.Timer;

  constructor(socket: WebSocket, protected _app, protected _db, protected _notifier) {
    super(socket);

    this._aliveTimer = setInterval(() => socket.ping(null, null, true), 50000);

    this._diff = new QueryDiff(this._db);

    this._diff.subscribe(this);

    let notifier = this._notifier.subscribe(message => {
      if (message.channel !== 'theron_watchers') {
        return;
      }

      const [action, tableName, rowId] = message.payload.split(',');

      for (let queryId of this._tables.get(tableName, emptyMap).keys()) {
        let query = this._queries.get(queryId);

        if (query) {
          this._diff.next({ type: EXECUTE_QUERY, payload: { queryId, queryText: query.get('queryText') } });
        }
      }
    });

    this.subscribe(
      message => {
        switch (message.type) {
          case SUBSCRIBE_QUERY:
            this._subscribeQuery(message);
            break;

          case UNSUBSCRIBE_QUERY:
            this._unsubscribeQuery(message);
            break;
        }
      },

      error => {
        notifier.unsubscribe();
        this._reset();
      },

      () => {
        notifier.unsubscribe();
        this._reset();
      }
    );
  }

  protected _reset() {
    clearTimeout(this._aliveTimer);
    console.log('reset');
  }

  protected async _subscribeQuery(message) {
    let { payload: { queryText, querySignature } } = message;

    try {
      if (!this._app.development && Theron.sign(queryText, this._app.secret) != querySignature) {
        throw `Invalid signature '${querySignature}' for query '${queryText}`;
      }

      let parser = new QueryParser(queryText);

      if (!(await parser.isSelectQuery())) {
        throw `Not a select query (${queryText})`;
      }

      let affectedTables = await parser.affectedTables();

      if (affectedTables.length === 0) {
        throw `Doesn't affect tables (${queryText})`;
      }

      let queryId = parser.queryId(this._app.db_url);

      await this._db.tx(t => {
        let q = [];

        affectedTables.forEach(table => {
          if (this._tables.has(table)) {
            let tableMeta = this._tables.get(table);
            this._tables = this._tables.set(table, tableMeta.set(queryId, true));
          } else {
            this._tables = this._tables.set(table, Map({ [queryId]: true }));

            // Create trigger

            q.push(t.none(`DROP TRIGGER IF EXISTS theron_watch_${table} ON ${table}`));
            q.push(t.none(`CREATE TRIGGER theron_watch_${table} AFTER INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE PROCEDURE theron_notify_trigger()`));
          }
        });

        return t.batch(q);
      });

      if (this._queries.has(queryId)) {
        let queryMeta = this._queries.get(queryId);
        this._queries = this._queries.set(queryId, queryMeta.set('subscribersCount', queryMeta.get('subscribersCount') + 1));
      } else {
        this._queries = this._queries.set(queryId, Map({ subscribersCount: 1, queryText, affectedTables: List(affectedTables) }));

        // Execute query

        this._diff.next({ type: EXECUTE_QUERY, payload: { queryId, queryText } });
      }

      console.log('-----');
      console.log('in:queries');
      console.log(this._queries.toObject());
      console.log('in:table');
      console.log(this._tables.toObject());

      this.next({ id: message.id, type: REQUEST_SUCCESS, payload: { queryId } });
    } catch (error) {
      console.log(error);
      this.next({ id: message.id, type: REQUEST_FAILURE, payload: { reason: error.toString() } });
    }
  }

  protected _unsubscribeQuery(message) {
    let { payload: { queryId } } = message;

    if (this._queries.has(queryId)) {
      let queryMeta = this._queries.get(queryId);

      if (queryMeta.get('subscribersCount') > 1) {
        this._queries = this._queries.set(queryId, queryMeta.set('subscribersCount', queryMeta.get('subscribersCount') - 1));
      } else {
        this._queries = this._queries.delete(queryId);

        queryMeta.get('affectedTables').forEach(tableName => {
          if (this._tables.has(tableName)) {
            let tableMeta = this._tables.get(tableName).delete(queryId);

            if (tableMeta.isEmpty()) {
              this._tables = this._tables.delete(tableName);

              // Remove trigger
            } else {
              this._tables = this._tables.set(tableName, tableMeta);
            }
          }
        });
      }
    }

    console.log('-----');
    console.log('out:queries');
    console.log(this._queries.toObject());
    console.log('out:table');
    console.log(this._tables.toObject());
  }
}
