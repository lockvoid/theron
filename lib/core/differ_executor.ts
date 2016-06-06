import * as redis from 'redis';

import { Observable } from 'rxjs/Observable';
import { DatabaseConnection } from './database_connection';
import { QueryCursor } from './query_cursor';
import { QueryDiff } from './query_diff';
import { PubSub, PUBLISH_QUEUE, RESPOND_QUEUE } from './pub_sub';
import { BEGIN_TRANSACTION, COMMIT_TRANSACTION, ROLLBACK_TRANSACTION } from './constants/actions';
import { SYSTEM_PREFIX, DATABASE_PREFIX } from './constants/flags';
import { logError } from './utils/log_error';
import { createQueue } from './utils/create_queue';

import 'rxjs/add/operator/first';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/timeout';

export const executorQueue = createQueue('executor');

export interface DifferExecutorConfig {
  channel: string;
  session: string;
}

export class DifferExecutor {
  constructor(protected _app, protected _query: string, protected _config: DifferExecutorConfig) {
  }

  execute(): Promise<void> {
    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`EXECUTOR: Calculate diffs for query '${this._query}'`);
    }

    return new Promise<void>((resolve, reject) => {
      const { session, channel } = this._config;

      this._beginTransaction(PubSub.client);

      const diff = new DatabaseConnection(this._app.db_url).first()
        .mergeMap(([conn]) => new QueryDiff(new QueryCursor(conn, this._query), this._cacheKey(), !!session));

      diff.reduce<redis.Multi>((protocol, payload) => <redis.Multi>this._publish(protocol, payload), PubSub.client.multi()).timeout(10000).subscribe(
        protocol => {
          protocol.exec();
        },

        err => {
          this._rollbackTransaction(PubSub.client);
          reject(err);
        },

        () => {
          this._commitTransaction(PubSub.client);
          resolve()
        }
      );
    });
  }

  protected _beginTransaction(protocol) {
    this._publish(PubSub.client, { type: BEGIN_TRANSACTION });
  }

  protected _commitTransaction(protocol) {
    this._publish(PubSub.client, { type: COMMIT_TRANSACTION });
  }

  protected _rollbackTransaction(protocol) {
    this._publish(PubSub.client, { type: ROLLBACK_TRANSACTION });
  }

  protected _publish(protocol: redis.RedisClient | redis.Multi, data: any) {
    const { session, channel } = this._config;

    const payload = Object.assign({}, data, { channel: this._config.channel, initial: session ? true : false });

    if (session) {
      return protocol.publish(RESPOND_QUEUE, PubSub.stringify({ session, payload }));
    } else {
      return protocol.publish(PUBLISH_QUEUE, PubSub.stringify({ channel: PubSub.sanitize(this._app.id, channel), payload }));
    }
  }

  protected _cacheKey(): string {
    return PubSub.sanitize(SYSTEM_PREFIX, DATABASE_PREFIX, 'cache', this._app.id, this._config.channel)
  }
}
