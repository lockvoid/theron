import * as cprocess from 'child_process';

import { Map, List, Set, fromJS } from 'immutable';
import { Observable } from 'rxjs/Observable';
import { TeardownLogic } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';
import { BaseRow } from './base_row';
import { PubSub } from './pub_sub';
import { QueryCursor } from './query_cursor';
import { RedisCommand } from './redis_command';
import { TheronDataArtefact } from './data_artefact';
import { ROW_ADDED, ROW_CHANGED, ROW_MOVED, ROW_REMOVED } from './constants/actions';
import { CACHE_TIMEOUT } from './constants/flags';
import { BAD_REQUEST } from './constants/errors';

import 'rxjs/add/observable/from';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';

type AnyMap = Map<string, any>;

export type PreparedState = { rows: List<AnyMap>, hashes: Map<string, string>, indexes: Map<string, List<string>> };

export class QueryDiff<T extends BaseRow> extends Observable<TheronDataArtefact<T>> {
  constructor(protected _cursor: QueryCursor<T>, protected _cacheKey: string, protected _initial = false) {
    super();
  }

  protected _subscribe(subscriber: Subscriber<any>): TeardownLogic {
    return this._prepareBackground().mergeMap(([curr, prev]) => this._calculateArtefacts(curr, prev)).subscribe(subscriber);
  }

  protected _prepareBackground(): Observable<[PreparedState, PreparedState]> {
    return this._collectRows().mergeMap(() => this._retrieveCache(), (rows, cache) => {
      return [{ rows, hashes: this._constructHashes(rows), indexes: this._constructIndexes(rows) }, cache]
    }).mergeMap(([curr]) => this._cacheState(curr), state => state);
  }

  protected _collectRows(): Observable<List<AnyMap>> {
    return this._cursor.map(row => Map<string, any>(row)).toArray().map(rows => List<Map<string, any>>(rows));
  }

  protected _retrieveCache(): Observable<PreparedState> {
    if (this._initial) {
      return Observable.of(null);
    }

    return new RedisCommand<string>(PubSub.client, 'get', this._cacheKey).map(cache => {
      if (!cache) {
        return null;
      }

      return fromJS(JSON.parse(cache)).toObject();
    });
  }

  protected _cacheState(curr: PreparedState) {
    const optimized = Map<string, any>(curr).update('rows', rows => {
      return rows.map(row => ({ id: row.get('id') }));
    });

    return new RedisCommand<string>(PubSub.client, 'set', this._cacheKey, JSON.stringify(optimized), 'px', CACHE_TIMEOUT);
  }

  protected _calculateArtefacts(curr: PreparedState, prev: PreparedState): Observable<TheronDataArtefact<T>> {
    if (this._initial || !prev) {
      return Observable.from(curr.rows.toArray()).map((row, index) => {
        return { type: ROW_ADDED, payload: { row: <T>row.toObject(), prevRowId: this._prevRowId(curr.rows, index) } }
      });
    }

    return new Observable<TheronDataArtefact<T>>(observer => {
      const ids = Set<string>().concat(Set.fromKeys(curr.hashes), Set.fromKeys(prev.hashes));

      ids.forEach(id => {
        const [currIndexes, prevIndexes] = this._padLists(curr.indexes.get(id, List<string>()), prev.indexes.get(id, List<string>()));

        // Order is important!

        currIndexes.zip(prevIndexes).forEach(([currIndex, prevIndex], index) => {
          const row = curr.rows.get(currIndex, Map<string, any>()).toObject();

          if (prevIndex === null) {
            observer.next({ type: ROW_ADDED, payload: { row, prevRowId: this._prevRowId(curr.rows, currIndex) } });
            return; // important!
          }

          if (currIndex === null) {
            observer.next({ type: ROW_REMOVED, payload: { rowId: id, prevRowId: this._prevRowId(prev.rows, prevIndex) } });
            return; // important!
          }

          if (prevIndex !== currIndex) {
            observer.next({ type: ROW_MOVED, payload: { rowId: id, prevRowId: this._prevRowId(curr.rows, currIndex) } });
          }

          if (curr.hashes.get(String(id)) !== prev.hashes.get(String(id))) {
            observer.next({ type: ROW_CHANGED, payload: { row, prevRowId: this._prevRowId(curr.rows, currIndex) } });
          }
        });
      });

      observer.complete();
    });
  }

  protected _constructHashes(rows: List<AnyMap>): Map<string, string> {
    return rows.reduce((hashes, row) => {
      if (!row.get('id')) {
         throw { code: BAD_REQUEST, reason: `Found a row without an 'id' column in the query '${this._cursor.query}'` };
      }

      const hash = this._hashOf(row), currHash = hashes.get(String(row.get('id')));

      if (!currHash) {
        return hashes.set(String(row.get('id')), hash);
      }

      if (hash != currHash) {
        throw { code: BAD_REQUEST, reason: `Found a collision in the query '${this._cursor.query}'` };
      }

      return hashes;
    }, Map<string, string>());
  }

  protected _constructIndexes(rows: List<AnyMap>): Map<string, List<string>> {
    return rows.reduce((ids, row, index) =>
      ids.update(String(row.get('id')), List<string>(), indexes => indexes.push(String(index)))
    , Map<string, List<string>>());
  }

  protected _prevRowId(rows: List<AnyMap>, index: number): string {
    return index === 0 ? null : rows.get(index - 1).get('id');
  }

  protected _hashOf(row: AnyMap): string {
    const pairs = Set.fromKeys(row).sort().reduce((acc, key) => {
      return acc.concat([key, row.get(key)]);
    }, []);

    return PubSub.sha256(JSON.stringify(pairs));
  }

  protected _padLists<R>(lhs: List<R>, rhs: List<R>): [List<R>, List<R>] {
    const lhsCount = lhs.count(), rhsCount = rhs.count();

    if (lhsCount === rhsCount) {
      return [lhs, rhs];
    }

    const pad = (count: number): T[] => new Array(count).fill(null)

    if (lhsCount > rhsCount) {
      return [lhs, rhs.concat(pad(lhsCount - rhsCount)).toList()];
    } else {
      return [lhs.concat(pad(rhsCount - lhsCount)).toList(), rhs];
    }
  }
}
