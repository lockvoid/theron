import { Map, Set } from 'immutable';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { TeardownLogic } from 'rxjs/Subscription';
import { AppRecord, AppSchema } from '../../app/server/models/app';
import { AliveWebSocket } from './alive_websocket';
import { BaseAction } from './base_action';
import { PubSub, PUBLISH_QUEUE } from './pub_sub';
import { RedisCommand } from './redis_command';
import { CONNECT, DISCONNECT, PING, PONG, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH } from './constants/actions';
import { SYSTEM_PREFIX, WEBSOCKET_PREFIX, DATABASE_PREFIX, PING_TIMEOUT, PONG_TIMEOUT, DATABASE_PING_TIMEOUT, CACHE_TIMEOUT, CHANNEL_REGEX } from './constants/flags';
import { INTERNAL_SERVER_ERROR, BAD_REQUEST, UNAUTHORIZED_REQUEST, NOT_FOUND, RESOURCE_GONE } from './constants/errors';
import { logError } from './utils/log_error';

import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/race';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/skipWhile';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/timeout';

const uuid = require('uuid');

export class RequestRouter extends Observable<any /* TODO */> {
  protected _anchor = new Subject<any>();
  protected _output = new Subject<any>();
  protected _tokens = Map<string /* channel */, Set<string /* token */>>();
  protected _app: AppSchema;

  constructor(protected _socket: AliveWebSocket) {
    super();

    this._socket.concatMap(action => this._route(action)).subscribe(null, err => this._error(err));
    this._anchor.subscribe(this._socket);
  }

  protected _route(req: any): Observable<void> {
    if (!this._isConnected() && req.type !== CONNECT) {
      throw { code: UNAUTHORIZED_REQUEST, reason: `App isn't connected` };
    }

    switch (req.type) {
      case CONNECT:
        return Observable.from(this._onConnect(req));

      case DISCONNECT:
        return Observable.from(this._onDisconnect(req));

      case SUBSCRIBE:
        return Observable.from(this._onSubscribe(req));

      case UNSUBSCRIBE:
        return Observable.from(this._onUnsubscribe(req));

      case PUBLISH:
        return Observable.from(this._onPublish(req));
    }

    return Observable.empty<void>();
  }

  protected _error(err) {
    if (err && !err.code) {
      throw err;
    }

    if (err && err.code >= 3000) {
      this._anchor.error({ code: err.code, reason: err.reason });
    }
  }

  protected _subscribe(subscriber: Subscriber<any /*TODO*/>): TeardownLogic {
    return this._output.map(action => this._assignMeta(action)).subscribe(subscriber);
  }

  protected async _onConnect({ id, app }): Promise<void> {
    try {
      this._app = await AppRecord.query().where('name', app).first();
    } catch (err) {
      logError(err);
      throw { code: INTERNAL_SERVER_ERROR, reason: `An error has occurred` };
    }

    if (!this._app) {
      throw { code: NOT_FOUND, reason: `App '${name}' doesn't exist` };
    }

    this._respond({ type: OK, id, message: 'Greatings from Cybertron!' });

    this._output.next({ type: CONNECT });
  }

  protected async _onDisconnect({ id }): Promise<void> {
    this._anchor.complete();
    this._output.next({ type: DISCONNECT });
  }

  protected async _onSubscribe({ id, channel, query, signature }): Promise<void> {
    if (!channel && !query) {
      return this._respond({ type: ERROR, id, code: BAD_REQUEST, reason: `Channel is required` });
    }

    if (!query && !this._validateChannel(channel)) {
      return this._respond({ type: ERROR, id, code: BAD_REQUEST, reason: `Channel '${channel}' includes invalid characters` });
    }

    if (!this._app.development && !this._isSignedChannel(channel, signature, this._app.secret)) {
      return this._respond({ type: ERROR, id, code: UNAUTHORIZED_REQUEST, reason: `Invalid signature '${signature}' for '${channel}'` });
    }

    const token = uuid.v1();

    if (query) {
      channel = PubSub.sanitize(DATABASE_PREFIX, PubSub.sha256(query));
    }

    this._openChannel(channel, token, query);

    this._respond({ type: OK, id, channel, token });
  }

  protected async _onUnsubscribe({ id, token }): Promise<void> {
    if (!token) {
      return this._respond({ type: ERROR, id, code: BAD_REQUEST, reason: `Unsubscribe token '${token}' is required` });
    }

    this._respond({ type: OK, id });
  }

  protected async _onPublish({ id, channel, payload, secret }): Promise<void> {
    if (!channel) {
      return this._respond({ type: ERROR, id, code: BAD_REQUEST, reason: `Channel is required` });
    }

    if (!this._validateChannel(channel)) {
      return this._respond({ type: ERROR, id, code: BAD_REQUEST, reason: `Channel '${channel}' includes invalid characters` });
    }

    if (!this._app.development && secret !== this._app.secret) {
      return this._respond({ type: ERROR, id, code: UNAUTHORIZED_REQUEST, reason: `Invalid secret key for '${this._app.name}'` });
    }

    const message = PubSub.stringify({ channel: PubSub.sanitize(this._app.id, channel), payload: { type: PUBLISH, channel, payload } });

    PubSub.client.publish(PUBLISH_QUEUE, message, (err, res) => {
      if (err) {
        logError(err);
        return this._respond({ type: ERROR, id, code: INTERNAL_SERVER_ERROR, reason: `Messaging service has errored` });
      }

      if (process.env.NODE_ENV !== 'PRODUCTION') {
        console.log(`ROUTER: Publish to '${this._app.name}:${channel}'...`);
      }

      this._respond({ type: OK, id });
    });
  }

  protected _openChannel(channel: string, token: string, query: string): void {
    const heartbeat = this._keepObserverAlive(channel, token);

    heartbeat.subscribe(this._hookObserverLifecycle(channel, token));
    heartbeat.subscribe(this._registerObserver(channel, token, query));

    if (query) {
      heartbeat.subscribe(this._tryToLockDatabase(channel, token, query));

      if (this._countDatabaseTokens() === 1) {
        heartbeat.subscribe(this._monitorIsDatabaseAlive());
      }
    }
  }

  protected _keepObserverAlive(channel: string, token: string): Observable<any> {
    const ping = Observable.interval(PING_TIMEOUT).takeUntil(
      Observable.race(
        this._socket.first(req => this._isReasonToDisposeObserver(req, channel, token)),
        this._anchor.first(req => this._isReasonToDisposeObserver(req, channel, token))
      )
    );

    const pong = ping.do(() => this._pingRequest(token))
      .mergeMap(() => this._pongResponse(token).timeout(PONG_TIMEOUT)).share();

    pong.subscribe(
      () => {
        if (process.env.NODE_ENV !== 'PRODUCTION') {
          console.log(`ROUTER: Observer '${token}' is alive`);
        }
      },

      () => {
        if (process.env.NODE_ENV !== 'PRODUCTION') {
          console.log(`ROUTER: Observer '${token}' is dead`);
        }
      },

      () => {
        if (process.env.NODE_ENV !== 'PRODUCTION') {
          console.log(`ROUTER: Observer '${token}' is gone`);
        }
      }
    );

    return pong;
  }

  protected _hookObserverLifecycle(channel: string, token: string): Subscriber<void> {
    if (this._addToken(channel, token) /* tokens count */  === 1) {
      this._output.next({ type: SUBSCRIBE, channel });
    }

    return new Subscriber<void>(
      null,

      () => {
        if (this._removeToken(channel, token) /* tokens count */ === 0) {
          this._output.next({ type: UNSUBSCRIBE, channel });
        }
      },

      () => {
        if (this._removeToken(channel, token) /* tokens count */ === 0) {
          this._output.next({ type: UNSUBSCRIBE, channel });
        }
      }
    );
  }

  protected _registerObserver(channel: string, token: string, query: string): Subscriber<void> {
    const [appKey, channelKey, tokenKey] = this._observerKey(channel, token, !!query);

    const redisEval = (...args: any[]) => PubSub.client.eval(...args, err => {
      if (err) {
        logError(err);
        this._respond({ type: ERROR, token, code: INTERNAL_SERVER_ERROR, reason: `Can't perform an atomic request` });
      }
    });

    const script = `
      local app, channel, token, lifetime = KEYS[1], KEYS[2], KEYS[3], ARGV[1]

      redis.call("sadd", app, channel)
      redis.call("pexpire", app, lifetime)

      redis.call("sadd", channel, token)
      redis.call("pexpire", channel, lifetime)

      redis.call("set", token, 1, "px", lifetime)
    `;
    redisEval(script, 3, appKey, channelKey, tokenKey, this._observerExpiresIn());

    return new Subscriber<void>(
      () => {
        const script = `
          local app, channel, token, lifetime = KEYS[1], KEYS[2], KEYS[3], ARGV[1]

          redis.call("pexpire", app, lifetime)
          redis.call("pexpire", channel, lifetime)
          redis.call("pexpire", token, lifetime)
        `;
        redisEval(script, 3, appKey, channelKey, tokenKey, this._observerExpiresIn());
      },

      () => {
        const script = `
          local app, channel, token = KEYS[1], KEYS[2], KEYS[3]

          redis.call("srem", app, channel)
          redis.call("srem", channel, token)
          redis.call("del", token)
        `;
        redisEval(script, 3, appKey, channelKey, tokenKey);
      },

      () => {
        const script = `
          local app, channel, token = KEYS[1], KEYS[2], KEYS[3]

          redis.call("srem", app, channel)
          redis.call("srem", channel, token)
          redis.call("del", token)
        `;
        redisEval(script, 3, appKey, channelKey, tokenKey);
      }
    );
  }

  protected _tryToLockDatabase(channel: string, token: string, query: string): Subscriber<void> {
    PubSub.client.publish(PubSub.sanitize(SYSTEM_PREFIX, 'differ'), this._lockingDirectiveForBalancer(channel, query), err => {
      if (err) {
        logError(err);
        this._respond({ type: ERROR, token, code: INTERNAL_SERVER_ERROR, reason: `Can't lock the database because of the messaging service` });
      }
    });

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`ROUTER: Forward query '${channel}' to database management`);
    }

    return new Subscriber<void>(
      () => {
        PubSub.client.expire(PubSub.sanitize(SYSTEM_PREFIX, DATABASE_PREFIX, 'cache', this._app.id, channel), CACHE_TIMEOUT / 1000);
      },

      () => {
        // nothing
      },

      () => {
        // nothing
      }
    );

  }

  protected _monitorIsDatabaseAlive() {
    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`ROUTER: Start monitoring database`);
    }

    const alive = Observable.interval(DATABASE_PING_TIMEOUT).mergeMap(() => this._queryDatabaseStatus()).skipWhile(alive => !!alive).take(1).subscribe(
      () => {
        this._tokens.keySeq().forEach(channel => {
          this._respond({ type: ERROR, channel, code: RESOURCE_GONE, reason: `Database connection was interrupted` });
        });
      },

      err => {
        this._tokens.keySeq().forEach(channel => {
          this._respond({ type: ERROR, channel, code: INTERNAL_SERVER_ERROR, reason: `Can't perform an atomic request` });
        });
      }
    );

    return new Subscriber<void>(
      null,

      () => {
        if (!this._countDatabaseTokens()) {
          alive.unsubscribe();
        }

        if (process.env.NODE_ENV !== 'PRODUCTION') {
          console.log(`ROUTER: End monitoring database`);
        }
      },

      () => {
        if (!this._countDatabaseTokens()) {
          alive.unsubscribe();
        }

        if (process.env.NODE_ENV !== 'PRODUCTION') {
          console.log(`ROUTER: End monitoring database`);
        }
      }
    );
  }

  protected _queryDatabaseStatus(): Observable<any> {
    return new RedisCommand(PubSub.client, 'exists', PubSub.sanitize(SYSTEM_PREFIX, DATABASE_PREFIX, 'alive', this._app.id, PubSub.sha256(this._app.db_url)));
  }

  protected _countDatabaseTokens(): number {
    return this._tokens.reduce<number>((count, tokens, channel) => channel.startsWith(DATABASE_PREFIX + ':') ? tokens.count() : 0, 0);
  }

  protected _lockingDirectiveForBalancer(channel: string, query: string): string {
    return PubSub.stringify({ app: this._app, session: this._socket.id, channel, query, initial: this._tokensCount(channel) === 1 });
  }

  protected _pingRequest(token: string): void {
    this._respond({ type: PING, id: null, token });
  }

  protected _pongResponse(token: string): Observable<any> {
    return this._socket.first(req => req.type === PONG && req.token == token)
  }

  protected _isConnected(): boolean {
    return !!this._app;
  }

  protected _isReasonToDisposeObserver(req: any, channel: string, token: string): boolean {
    return (req.type === ERROR && (req.channel === channel || req.token === token)) || (req.type === UNSUBSCRIBE && req.token === token) || req.type === DISCONNECT;
  }

  protected _addToken(channel: string, token: string): number {
    this._tokens = this._tokens.update(channel, Set<string>(), tokens => tokens.add(token));

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`ROUTER: Add token '${token}' to channel '${channel} (${this._tokensCount(channel)})' in app '${this._app.name} (${this._app.id})'`);
    }

    return this._tokensCount(channel);
  }

  protected _removeToken(channel: string, token: string): number {
    this._tokens = this._tokens.update(channel, Set<string>(), tokens => tokens.delete(token));

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`ROUTER: Remove token '${token}' from channel '${channel} (${this._tokensCount(channel)})' in app '${this._app.name} (${this._app.id})'`);
    }

    return this._tokensCount(channel);
  }

  protected _tokensCount(channel: string) {
    return this._tokens.get(channel).count();
  }

  protected _validateChannel(channel: string): boolean {
    return CHANNEL_REGEX.test(channel);
  }

  protected _isSignedChannel(channel: string, signature: string, secret: string): boolean {
    return PubSub.hmac(channel, secret) === signature;
  }

  protected _observerKey(channel: string, token: string, db: boolean): [string, string, string] {
    const kind = db ? DATABASE_PREFIX : WEBSOCKET_PREFIX;

    return [
      PubSub.sanitize(SYSTEM_PREFIX, kind, 'observers', this._app.id),
      PubSub.sanitize(SYSTEM_PREFIX, kind, 'observers', this._app.id, channel),
      PubSub.sanitize(SYSTEM_PREFIX, kind, 'observers', this._app.id, channel, token),
    ]
  }

  protected _observerExpiresIn(): number {
    return PONG_TIMEOUT + PING_TIMEOUT + 1000;
  }

  protected _respond(res) {
    this._anchor.next(res);
  }

  protected _assignMeta(action: any): any {
    return Object.assign({}, action, { app: this._app, socket: this._socket });
  }
}
