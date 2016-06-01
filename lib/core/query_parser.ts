import * as cprocess from 'child_process';

import { Observable } from 'rxjs/Observable';
import { TeardownLogic } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';
import { INTERNAL_SERVER_ERROR, BAD_REQUEST } from './constants/errors';
import { logError } from './utils/log_error';

import 'rxjs/add/observable/bindNodeCallback';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/if';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/mergeMap';

export class QueryParser extends Observable<string[]> {
  static parser = Observable.bindNodeCallback<[string, string]>(cprocess.exec);

  constructor(protected _query: string) {
    super();
  }

  get query(): string {
    return this._query;
  }

  protected _subscribe(subscriber: Subscriber<string[]>): TeardownLogic {
    if (!this._query) {
      subscriber.error({ code: BAD_REQUEST, reason: `SQL query is required` });
      return;
    }

    return QueryParser.parser(this._command()).catch(err => this._parseError(err)).mergeMap(res => this._parseTree(res)).subscribe(subscriber);
  }

  protected _command(): string {
    return `echo "${this._query}" | /* @echo BIN_PATH */queryparser --json`;
  }

  protected _parseTree([stdout]: string[]): Observable<string[]> {
    try {
      var tree = JSON.parse(stdout.toString());
    } catch(err) {
      logError(err);
      throw { code: INTERNAL_SERVER_ERROR, reason: `An error has occurred` };
    }

    if (!this._isSelectQuery(tree)) {
      throw { code: BAD_REQUEST, reason: `Query ${this._query} isn't SELECT` };
    }

    const name = (node: any) => {
      return node['schemaname'] ? [node['schemaname'], node['relname']].join('.') : node['relname'];
    }

    const find = (node: any, tables: string[]): string[] => {
      if (typeof node === 'object' && node !== null) {
        Object.keys(node).forEach(key => {
          let curr = node[key];

          if (key === 'RANGEVAR') {
            tables = tables.concat(name(curr));
          } else {
            tables = tables.concat(find(curr, []));
          }
        });
      }

      return tables;
    }

    return Observable.of(find(tree, []).filter(/* unique */ (table, index, tables) => tables.indexOf(table) === index));
  }

  protected _parseError(err): Observable<any> {
    return Observable.throw({ code: BAD_REQUEST, reason: `Invalid SQL query '${this._query}'` });
  }

  protected _isSelectQuery([tree]: any): boolean {
    return tree && typeof tree === 'object' && 'SELECT' in tree
  }
}
