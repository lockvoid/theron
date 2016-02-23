import { WebSocketSubject } from '../../lib/websocket';
import { Map, List } from 'immutable';

import * as WebSocket from 'ws';

import { SUBSCRIBE_QUERY, UNSUBSCRIBE_QUERY, REQUEST_SUCCESS, REQUEST_FAILURE, ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED } from '../../lib/constants';
import { QueryParser } from './query_parser';

// const test = async () => {
//   try {
// //    let parser = new QueryParser('SELECT * FROM sd.CUSTOMERS WHERE ID IN (SELECT ID FROM COMPANIES WHERE SALARY > 4500)');
//   let parser = new QueryParser("UPDATE Customers SET ContactName='Alfred Schmidt', City='Hamburg'; SELECT 1;");
//   //let parser = new QueryParser("UPDATE dummy SET customer=subquery.customer,address=subquery.address, partn=subquery.partn FROM (SELECT address_id, customer, address, partn FROM  tests) AS subquery WHERE dummy.address_id=subquery.address_id");
//
//     //let [query] = await parser.parse();
//
//     //// isSelectQuery();
//     //// getAffectedTables();
//     //// hash();
//
//     //if (!('SELECT' in query)) {
//     //  console.log('not select');
//     //  // send REQUEST_FAILURE; not a select query
//     //}
//
//     console.log(parser.queryHash()); //JSON.stringify(query));
//     console.log(await parser.affectedTables()); //JSON.stringify(query));
//     console.log(await parser.isSelectQuery()); //JSON.stringify(query));
//   } catch (error) {
//     // send REQUEST_FAILURE;
//     console.log(error);
//   }
// }
//
// test();
//

        //this.next({ id: message.id, type: REQUEST_SUCCESS, payload: { queryId: 'someid' } });

     //if (!this.sub) {
     //  this.sub = true;
     //  setTimeout(() => {
     //  this.next({ id: 'someid', type: ROW_ADDED, payload: { row: { id: '1', name: 'name' }, offset: 1 } });
     //  this.next({ id: 'someid', type: ROW_ADDED, payload: { row: { id: '2', name: 'name' }, offset: 2 } });
     //  this.next({ id: 'someid', type: ROW_ADDED, payload: { row: { id: '3', name: 'name' }, offset: 3 } });
     //}, 200);
     //}




export class Router extends WebSocketSubject<any> {
  protected _queries = Map<string, any>();
  protected _tables = Map<string, any>();

  constructor(socket: WebSocket) {
    super(socket);

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
        this._reset();
      },

      () => {
        this._reset();
      }
    );
  }

  protected _reset() {
    console.log('reset');
  }

  protected async _subscribeQuery(message) {
    let { payload: { queryText } } = message;

    try {
      let parser = new QueryParser(queryText);

      if (!(await parser.isSelectQuery())) {
        throw `Not a select query (${queryText})`;
      }

      let affectedTables = await parser.affectedTables();

      if (affectedTables.length === 0) {
        throw `Doesn't affect tables (${queryText})`;
      }

      let queryId = parser.queryId();

      if (this._queries.has(queryId)) {
        let queryMeta = this._queries.get(queryId);
        this._queries = this._queries.set(queryId, queryMeta.set('subscribersCount', queryMeta.get('subscribersCount') + 1));
      } else {
        this._queries = this._queries.set(queryId, Map({ subscribersCount: 1, queryText, affectedTables: List(affectedTables) }));

          console.log('sql query');
        // perform sql query
      }

      affectedTables.forEach(table => {
        if (this._tables.has(table)) {
          let tableMeta = this._tables.get(table);
          this._tables = this._tables.set(table, tableMeta.set(queryId, true));
        } else {
          this._tables = this._tables.set(table, Map({ [queryId]: true }));

          console.log('add watcher');
          // create watcher
        }
      });

      console.log('-----');
      console.log('in:queries');
      console.log(this._queries.toObject());
      console.log('in:table');
      console.log(this._tables.toObject());

      this.next({ id: message.id, type: REQUEST_SUCCESS, payload: { queryId } });
    } catch (error) {
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
              console.log('remove watcher');
              // remove watcher
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
