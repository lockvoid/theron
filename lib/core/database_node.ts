import { Map, Set } from 'immutable';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject, AnonymousSubject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';
import { DatabaseWatcher } from './database_watcher';
import { DatabaseConnection } from './database_connection';
import { DatabaseTransaction } from './database_transaction';
import { QueryParser } from './query_parser';
import { RedisCommand } from './redis_command';
import { PubSub, PUBLISH_QUEUE } from './pub_sub';
import { EXECUTE, ERROR } from './constants/actions';
import { SYSTEM_PREFIX, DATABASE_PREFIX, DATABASE_LOCK_TIMEOUT, DATABASE_PING_TIMEOUT } from './constants/flags';
import { INTERNAL_SERVER_ERROR, BAD_REQUEST } from './constants/errors';
import { executorQueue } from './differ_executor';
import { logError } from './utils/log_error';

import 'rxjs/add/observable/from';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/race';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/multicast';
import 'rxjs/add/operator/publishLast';
import 'rxjs/add/operator/skipWhile';
import 'rxjs/add/operator/takeUntil';

export class DatabaseNode extends AnonymousSubject<any> {
  protected _hashes = Map<string, Observable<string>>();
  protected _tables = Map<string /* table */, Set<string /* channel */>>();
  protected _output = new Subject<any>();
  protected _supervisor: Observable<any>;

  constructor(protected _app, protected _databaseKey: string, protected _lockToken: string) {
    super(new ReplaySubject);

    this._supervisor = this._constructSupervisor();
  }

  get id() {
    return this._databaseKey;
  }

  protected _subscribe(subscriber: Subscriber<any>): Subscription {
    return this._supervisor.subscribe(subscriber);
  }

  protected _unbufferQueries() {
    const queue = this.destination;

    this.destination = new Subscriber<any>(
      req => {
        this._parseQuery(req);
      },

      err => {
        this._output.error(err);
      },

      () => {
        this._output.complete();
      }
    );

    if (queue && queue instanceof ReplaySubject) {
      const subscription = queue.subscribe(this.destination);
    }
  }

  protected _constructSupervisor(): Observable<any> {
    return new Observable(observer => {
      this._connectDatabase().do(event => this._calculateArtefacts(event)).takeUntil(this._notObsolete()).subscribe(observer);

      return () => {
        const script = `
          local databaseKey, lockToken = KEYS[1], ARGV[1]

          if redis.call("get", databaseKey) == lockToken then
            return redis.call("del", databaseKey)
            -- remove cache diff
          else
            return 0
          end
        `;

        PubSub.client.eval(script, 1, this._databaseKey, this._lockToken);
      }
    }).multicast(this._output).refCount();
  }

  protected _connectDatabase(): Observable<any> {
    return new DatabaseConnection(this._app.db_url).first().mergeMap(([conn]) => new DatabaseWatcher(conn, { next: () => this._unbufferQueries() }));
  }

  protected _notObsolete(): Observable<any> {
    return Observable.race(
      Observable.interval(DATABASE_PING_TIMEOUT).mergeMap(() => this._expireUnlessValid()),
      Observable.interval(DATABASE_PING_TIMEOUT).mergeMap(() => this._expireOnIdle())
    );
  }

  protected _expireUnlessValid(): Observable<any> {
    const script = `
      local databaseKey, lockToken, expiresIn = KEYS[1], ARGV[1], ARGV[2]

      if redis.call("get", databaseKey) == lockToken then
        return redis.call("pexpire", databaseKey, expiresIn)
      else
        return 0
      end
    `;

    return new RedisCommand(PubSub.client, 'eval', script, 1, this._databaseKey, this._lockToken, DATABASE_LOCK_TIMEOUT).skipWhile(valid => !!valid);
  }

  protected _expireOnIdle(): Observable<any> {
    const script = `
      local channels = redis.call('SMEMBERS', KEYS[1])

      if next(channels) == nil then
        return {}
      else
        local valid = {};

        for i,v in pairs(channels) do
          if redis.call('EXISTS', v) > 0 then table.insert(valid, v) end
        end

        return valid
      end
    `;

    return new RedisCommand<string[]>(PubSub.client, 'eval', script, 1, this._appKey()).do(channels => this._syncState(channels)).skipWhile(busy => !!busy.length);
  }

  protected _parseQuery({ session, channel, query, initial }) {
    if (!this._isLocked(channel)) {
      const parser = new QueryParser(query).concatMap(tables => this._createTrigger(query, tables).mergeMap(() => Observable.from(tables))).publishLast().refCount();

      this._addChannel(channel, parser);

      parser.subscribe(
        table => {
          this._tables = this._tables.update(table, Set<string>(), channels => channels.add(channel));
        },

        err => {
          this._removeChannel(channel);
          this._publish(channel, Object.assign(err, { type: ERROR, channel }));
        }
      );
    }

    this._hashes.get(channel).subscribe(null, () => {}, () => {
      if (initial) {
        executorQueue.add({ app: this._app, query, channel, session });
      }
    });
  }

  protected _createTrigger(query: string, tables: string[]): Observable<any> {
    if (!tables.length) {
      return Observable.throw({ code: BAD_REQUEST, reason: `Bad SQL query '${query}'` });
    }

    return new DatabaseConnection(this._app.db_url).first().mergeMap(([conn, done]) => {
      const tx = new DatabaseTransaction(conn, done);

      tables.forEach(table => {
        tx.add(query => {
          return query(`DROP TRIGGER IF EXISTS theron_watch_${table} ON ${table}`);
        });

        tx.add(query => {
          return query(`CREATE TRIGGER theron_watch_${table} AFTER INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE PROCEDURE theron_notify_trigger()`);
        });
      });

      return tx;
    }).catch(err => {
      logError(err);
      return Observable.throw({ code: INTERNAL_SERVER_ERROR, reason: `Can't create triggers for query '${query}'` });
    });
  }

  protected _calculateArtefacts(event): void {
    this._tables.get(event[1], Set<string>()).forEach(channel => {
      if (!this._hashes.has(channel)) {
        return;
      }

      executorQueue.add({ app: this._app, query: (<any>this._hashes.get(channel)).source.source.source.query, channel });
    });
  }

  protected _syncState(channels: string[]) {
    channels = channels.map(channel => channel.split(':').slice(4).join(':'));

    this._hashes = this._hashes.filter((_, channel) => channels.indexOf(channel) !== -1).toMap();
    this._tables = this._tables.map(table => table.intersect(channels)).toMap();

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`DIFFER: Channels for database '${this._app.name} (${this._app.id})': ${this._hashes.keySeq().toList().join(', ')}`);
    }
  }

  protected _addChannel(channel: string, parser: Observable<string>): void {
    this._hashes = this._hashes.set(channel, parser);
  }

  protected _removeChannel(channel: string) {
    this._hashes = this._hashes.delete(channel);
  }

  protected _isLocked(channel: string): boolean {
    return this._hashes.has(channel);
  }

  protected _appKey(): string {
    return PubSub.sanitize(SYSTEM_PREFIX, DATABASE_PREFIX, 'observers', this._app.id);
  }

  protected _publish(channel: string, payload: any): void {
    PubSub.client.publish(PUBLISH_QUEUE, PubSub.stringify({ channel: PubSub.sanitize(this._app.id, channel), payload }));
  }
}
