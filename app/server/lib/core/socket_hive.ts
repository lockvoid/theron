import { Map, Set } from 'immutable';
import { NextObserver, ErrorObserver } from 'rxjs/Observer';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { PubSub } from './pub_sub';
import { SocketResponder } from './socket_responder';
import { AliveWebSocket } from './alive_websocket';
import { pdel } from './lua_scripts';
import { logError } from '../../utils/log_error';
import { selectQueue, DEFAULT_QUEUE_OPTIONS } from '../../config/bull';
import { DISCONNECT, PING, PONG, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH } from '../../../../lib/constants';
import { SYSTEM_PREFIX, WEBSOCKET_PREFIX, DATABASE_PREFIX, PING_TIMEOUT, PONG_TIMEOUT } from '../../../../lib/constants';
import { SERVER_ERROR } from '../../../../lib/constants';

import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/timeout';

export class SocketHive extends SocketResponder implements NextObserver<any>, ErrorObserver<any> {
  protected _anchor = new Subject<any>();
  protected _channels = Map<string, Set<AliveWebSocket<any>>>();
  protected _tokens = Map<string, AliveWebSocket<any>>();
  protected _sub = PubSub.fork();

  constructor() {
    super();

    this._sub.on('pmessage', this._broadcast);
    this._sub.psubscribe(PubSub.publishChannel('*'));
    this._sub.psubscribe(PubSub.respondChannel('*'));
  }

  next(req) {
    this._anchor.next(req);

    switch (req.type) {
      case DISCONNECT:
        this._onDisconnect(req);
        break;

      case SUBSCRIBE:
        this._onSubscribe(req);
        break;

      case UNSUBSCRIBE:
        this._onUnsubscribe(req);
        break;

      case PUBLISH:
        this._onPublish(req);
        break;

      case ERROR:
        this._onError(req);
        break;
    }
  }

  error(err) {
    if (err.code >= 3000) {
      err.socket.error({ code: err.code, reason: err.reason });
    }

    this._onDisconnect(err);
  }

  protected _broadcast = (pattern: string, channel: string, message: string) => {
    const origin = PubSub.toOriginChannel(channel);
    const parsed = JSON.parse(message);

    if (PubSub.isPublishChannel(pattern)) {
      this._channels.get(origin, Set<AliveWebSocket<any>>()).forEach(socket => {
        socket.next(parsed);
      });
    } else {
      this._tokens.has(origin) && this._tokens.get(origin).next(parsed);
    }
  }

  protected _onDisconnect(req) {
    this._channels = this._channels.map(channel => channel.delete(req.socket)).filterNot(channel => channel.isEmpty()).toMap();
    this._tokens = this._tokens.filter((token, socket) => socket === req.socket).toMap();

    try {
      PubSub.client.eval(pdel, 1, this._observerKey(req, '*', '*'));
    } catch (err) {
      logError(err);
    }

    req.socket.complete();
  }

  protected async _onSubscribe(req) {
    PubSub.client.setex(this._observerKey(req, req.channel, req.token), this._observerExpiresIn(), true, async (err, res) => {
      if (err) {
        logError(err);
        return this._respond(req, ERROR, { code: SERVER_ERROR, reason: `Subscription isn't created`});
      }

      this._tokens = this._tokens.set(req.token, req.socket);

      // We can do it since a set is a collection of unique values.

      this._channels = this._channels.update(req.channel, Set<AliveWebSocket<any>>(), sockets => sockets.add(req.socket));

      // Ping the observer and renew the experation on pong.

      const interval = Observable.interval(PING_TIMEOUT).takeUntil(
        this._anchor.first(({ type, token, socket }) => (type === UNSUBSCRIBE && token == req.token) || (type === DISCONNECT && socket === req.socket))
      );

      interval.do(() => req.socket.next({ type: PING, token: req.token })).mergeMap(() =>
        req.socket.first(({ type, token }) => type === PONG && token == req.token).timeout(PONG_TIMEOUT)
      ).subscribe(
         () => {
           PubSub.client.expire(this._observerKey(req, req.channel, req.token), this._observerExpiresIn());

           if (process.env.NODE_ENV !== 'PRODUCTION') {
             console.log(`----> Subscription '${req.session}' is alive`);
           }
         },

         () => {
           if (process.env.NODE_ENV !== 'PRODUCTION') {
             console.log(`----> Subscription '${req.session}' is dead`);
           }
         }
      )

      // Process database channels.

      if (req.query) {
        selectQueue.add({ app: req.app, channel: req.channel, session: req.session, token: req.token, query: req.query }, DEFAULT_QUEUE_OPTIONS);
      }

      this._respond(req, OK, { channel: req.channel, token: req.token });

      if (process.env.NODE_ENV !== 'PRODUCTION') {
        try {
          var observersCount = await PubSub.countKeys(this._observerKey(req, req.channel, '*'));
        } catch (err) {
          logError(err);
        }

        console.log(`----> Socket '${req.session}' subscribed to '${req.channel}' with ${observersCount} observers`);
      }
    });
  }

  protected async _onUnsubscribe(req) {
    PubSub.client.del(this._observerKey(req, req.channel, req.token), async (err, res) => {
      if (err) {
        logError(err);
        return this._respond(req, ERROR, { code: SERVER_ERROR, reason: `Subscription isn't disposed`});
      }

      this._tokens = this._tokens.set(req.token, req.socket);

      try {
        var observersCount = await PubSub.countKeys(this._observerKey(req, req.channel, '*'));
      } catch (err) {
        logError(err);
        return this._respond(req, ERROR, { code: SERVER_ERROR, reason: `Subscription isn't disposed`});
      }

      if (observersCount === 0) {
        this._channels = this._channels.update(req.channel, Set<AliveWebSocket<any>>(), sockets => sockets.delete(req.socket));
      }

      this._respond(req, OK, { channel: req.channel, token: req.token });

      if (process.env.NODE_ENV !== 'PRODUCTION') {
        console.log(`----> Socket '${req.session}' unsubscribed from '${req.channel}' with ${observersCount} observers`);
      }
    });
  }

  protected _onPublish(req) {
    PubSub.publish(PubSub.publishChannel(req.channel), { type: PUBLISH, channel: req.channel, payload: req.payload });

    this._respond(req, OK);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`----> Publish to '${req.channel}'`);
    }
  }

  protected _onError(req) {
    this._respond(req, ERROR, { code: req.code, reason: req.reason });
  }

  protected _observerKey(req, channel: string, token: string) {
    return PubSub.sanitize(SYSTEM_PREFIX, WEBSOCKET_PREFIX, 'observers', channel, req.session, token);
  }

  protected _observerExpiresIn(): number {
    return (PONG_TIMEOUT + PING_TIMEOUT) / 1000 + 1;
  }
}
