import * as process from 'child_process';
import * as crypto from 'crypto';

export class QueryParser {
  protected _parsed: Promise<any>;

  constructor(protected _query: string) {
    this._parsed = new Promise((resolve, reject) => {
      process.exec(`echo "${this._query}" | queryparser --json`, (error, stdout, stderr) => {
        if (stderr) {
          return reject(stderr);
        }

        try {
          resolve(JSON.parse(stdout.toString()));
        } catch(error) {
          reject(error);
        }
      });
    });
  }

  isSelectQuery(): Promise<boolean> {
    return this._parsed.then(([query]) => query && typeof query === 'object' && 'SELECT' in query);
  }

  affectedTables(): Promise<string[]> {
    const name = (node) => {
      return node['schemaname'] ? [node['schemaname'], node['relname']].join('.') : node['relname'];
    }

    const find = (node, tables): string[] => {
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

    const uniq = (value, index, self) => {
      return self.indexOf(value) === index;
    }

    return this._parsed.then(query => find(query, []).filter(uniq));
  }

  queryId(): string {
   return crypto.createHash('sha256').update(this._query).digest('base64');
  }
}
