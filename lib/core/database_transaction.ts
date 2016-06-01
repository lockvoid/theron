import * as pg from 'pg';

import { List } from 'immutable';
import { Observable } from 'rxjs/Observable';
import { TeardownLogic } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';

import 'rxjs/add/observable/bindNodeCallback';
import 'rxjs/add/observable/defer';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

export type QueryExecutor = (query: string, values?: any[]) => Observable<any>;

export class DatabaseTransaction<T> extends Observable<T> {
  protected _query: QueryExecutor;
  protected _series = List<any>();

  constructor(protected _conn: pg.Client, protected _done: (err?: any) => void) {
    super();

    this._query = Observable.bindNodeCallback(_conn.query.bind(_conn));
  }

  add<R>(series: (executer: QueryExecutor, res: R) => Observable<R>) {
    this._series = this._series.push(series);
  }

  protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
    const series = this._waterfall(...this._series.toArray());

    this._begin().mergeMap(() => series).mergeMap(() => this._commit(), res => res).catch(err => this._rollback(err)).subscribe(subscriber);
  }

  protected _begin(): Observable<any> {
    return this._query('BEGIN');
  }

  protected _commit(): Observable<any> {
    return this._query('COMMIT');
  }

  protected _rollback(err: any): Observable<any> {
    return this._query('ROLLBACK').do(null, err => this._done(err)).mergeMap(() => Observable.throw(err));
  }

  protected _waterfall(...series) {
    return Observable.defer(() => {
      const batch = List<any>(series).rest();
      const first = series[0];

      return batch.reduce((acc, query) => acc.mergeMap(res => query(this._query, res), (_, res) => res.rows), first(this._query).map(res => res.rows));
    });
  }
}
