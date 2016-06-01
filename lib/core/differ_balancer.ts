import { Map, Set } from 'immutable';
import { Observer } from 'rxjs/Observer';
import { Subscription } from 'rxjs/Subscription';
import { PubSub, PUBLISH_QUEUE, RESPOND_QUEUE } from './pub_sub';
import { DatabaseNode } from './database_node';
import { ERROR } from './constants/actions';
import { INTERNAL_SERVER_ERROR } from './constants/errors';
import { SYSTEM_PREFIX, DATABASE_PREFIX, DATABASE_LOCK_TIMEOUT } from './constants/flags';
import { logError } from './utils/log_error';

const uuid = require('node-uuid');

export class DifferBalancer implements Observer<any> {
  protected _nodes = Map<string, DatabaseNode>();

  constructor(protected _id: number) {
  }

  get id(): number {
    return this._id;
  }

  next({ app, session, channel, query, initial }) {
    const databaseKey = this._databaseKey(app), lockToken = uuid.v1();

    PubSub.client.set(databaseKey, lockToken, 'nx', 'px', DATABASE_LOCK_TIMEOUT, (err, locked) => {
      if (err) {
        logError(err);
        return this._respond(session, { type: ERROR, channel, code: INTERNAL_SERVER_ERROR, reason: `Can't perform an atomic database lock` });
      }

      if (locked) {
        this._becomeNode(app, databaseKey, lockToken);
      }

      if (this._isNode(databaseKey)) {
        this._interceptRequest(databaseKey, { app, session, channel, query, initial });
      }
    });
  }

  error(err) {
    throw err;
  }

  complete() {
    this._nodes.forEach(node => node.complete());
  }

  balance(cb: () => void): void {
    setTimeout(cb);
  }

  protected _becomeNode(app, databaseKey: string, lockToken: string) {
    const node = new DatabaseNode(app, databaseKey, lockToken);

    this._addNode(node);

    node.subscribe(
      null,

      err => {
        this._removeNode(node);

        if (process.env.NODE_ENV !== 'PRODUCTION') {
          console.log(`DIFFER: Database of '${app.name} (${app.id})' errored: ${err}`);
        }
      },

      () => {
        this._removeNode(node);

        if (process.env.NODE_ENV !== 'PRODUCTION') {
          console.log(`DIFFER: Database of '${app.name} (${app.id})' closed connection`);
        }
      }
    );

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`DIFFER: Differ ${this.id} acquired database of '${app.name} (${app.id})'`);
    }
  }

  protected _interceptRequest(databaseKey: string, req): void {
    this._nodes.get(databaseKey).next(req);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`DIFFER: Differ ${this.id} intercepted request for for app '${req.app.name} (${req.app.id})'`);
    }
  }

  protected _addNode(node: DatabaseNode): void {
    this._nodes = this._nodes.set(node.id, node);
  }

  protected _removeNode(node: DatabaseNode): void {
    this._nodes = this._nodes.delete(node.id);
  }

  protected _isNode(databaseKey: string): boolean {
    return this._nodes.has(databaseKey);
  }

  protected _databaseKey(app): string {
    return PubSub.sanitize(SYSTEM_PREFIX, DATABASE_PREFIX, 'alive', app.id, PubSub.sha256(app.db_url));
  }

  protected _respond(session: string, payload: any): void {
    PubSub.client.publish(RESPOND_QUEUE, PubSub.stringify({ session, payload }));
  }
}
