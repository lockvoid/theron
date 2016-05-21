import * as redis from 'redis';

import { Map } from 'immutable';
import { NextObserver, ErrorObserver } from 'rxjs/Observer';
import { OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH, DISCONNECT } from '../../../../lib/constants';

export class ResponseReducer implements NextObserver<any>, ErrorObserver<any> {
  static REDIS_NAMESPACE = 'TN:WS:';

  protected _state = Map<string, Map<string, Map<string, any>>>();
  protected _pub = redis.createClient(process.env.REDIS_URL);
  protected _sub = redis.createClient(process.env.REDIS_URL);

  constructor() {
    this._sub.on('pmessage', this._broadcast);
    this._sub.psubscribe(this._externalChannel('*'));
  }

  next(req) {
    switch (req.type) {
      case DISCONNECT:
        return this._onDisconnect(req);

      case SUBSCRIBE:
        return this._onSubscribe(req);

      case UNSUBSCRIBE:
        return this._onUnsubscribe(req);

      case PUBLISH:
        return this._onPublish(req);

      case ERROR:
        return this._onError(req);
    }
  }

  error(err) {
    if (err.code >= 3000) {
      err.socket.error({ code: err.code, reason: err.reason });
    }

    this._onDisconnect(err);
  }

  protected _broadcast = (pattern: string, channel: string, message) => {
    this._state.get(this._internalChannel(channel), Map<string, any>()).forEach(state => {
      state.get('socket').next(JSON.parse(message));
    });
  }

  protected _onDisconnect(req) {
    this._state = this._state.map(channel => channel.delete(req.socket.objectId)).filterNot(channel => channel.isEmpty()).toMap();

    try {
      req.socket.complete();
    } catch (err) {
      console.log(err);
    }
  }

  protected _onSubscribe(req) {
    this._state = this._state.updateIn(this._socketPath(req), Map({ socket: req.socket, count: 0 }), socket => socket.update('count', count => count + 1));

    req.socket.next(this._toResponse(OK, req, { channel: req.channel }));

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`<---- Subscribe to '${req.channel}' with ${this._state.getIn(this._socketPath(req, 'count'))} clients`);
    }
  }

  protected _onUnsubscribe(req) {
    if (this._state.getIn(this._socketPath(req, 'count'), 1) === 1) {
      this._state = this._state.deleteIn(this._socketPath(req));

      if (this._state.has(req.channel) && this._state.get(req.channel).isEmpty()) {
        this._state = this._state.delete(req.channel);
      }
    } else {
      this._state = this._state.updateIn(this._socketPath(req, 'count'), count => count - 1);
    }

    req.socket.next(this._toResponse(OK, req, { channel: req.channel }));

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`----> Unsubscribe from '${req.channel}' with ${this._state.getIn(this._socketPath(req, 'count'))} clients`);
    }
  }

  protected _onPublish(req) {
    this._pub.publish(this._externalChannel(req.channel), JSON.stringify({ type: PUBLISH, channel: req.channel, payload: req.payload }));

    req.socket.next(this._toResponse(OK, req));

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`----> Publish to '${req.channel}'`);
    }
  }

  protected _onError(req) {
    req.socket.next(this._toResponse(ERROR, req, { code: req.code, reason: req.reason }));
  }

  protected _toResponse(type: string, { id }, res?) {
    return Object.assign({}, res, { type, id });
  }

  protected _socketPath(req, ...path): string[] {
    return [req.channel, req.socket.objectId].concat(path);
  }

  protected _externalChannel(internalChannel: string) {
    return ResponseReducer.REDIS_NAMESPACE + internalChannel;
  }

  protected _internalChannel(externalChannel: string) {
    return externalChannel.replace(ResponseReducer.REDIS_NAMESPACE, '');
  }
}
