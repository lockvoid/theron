import { Map } from 'immutable';
import { NextObserver, ErrorObserver } from 'rxjs/Observer';
import { PubSub } from './pub_sub';
import { SocketResponder } from './socket_responder';
import { DISCONNECT, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH, SYSTEM_PREFIX, WEBSOCKET_PREFIX } from '../../../../lib/constants';

export class ChannelHive extends SocketResponder implements NextObserver<any>, ErrorObserver<any> {
  protected _state = Map<string, Map<string, Map<string, any>>>();
  protected _sub = PubSub.fork();

  constructor() {
    super();

    this._sub.on('pmessage', this._broadcast);
    this._sub.psubscribe(this._pubChannel('*'));
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
    this._state.get(this._subChannel(channel), Map<string, any>()).forEach(state => {
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

    this._respond(req, OK, { channel: req.channel });

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`<---- Subscribe to '${req.channel}' with ${this._state.getIn(this._socketPath(req, 'count'))} clients`);
    }
  }

  protected _onUnsubscribe(req) {
    if (this._channelWeight(req) <= 1) {
      this._state = this._state.deleteIn(this._socketPath(req));

      if (this._state.has(req.channel) && this._state.get(req.channel).isEmpty()) {
        this._state = this._state.delete(req.channel);
      }
    } else {
      this._state = this._state.updateIn(this._socketPath(req, 'count'), count => count - 1);
    }

    this._respond(req, OK, { channel: req.channel });

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`----> Unsubscribe from '${req.channel}' with ${this._state.getIn(this._socketPath(req, 'count'))} clients`);
    }
  }

  protected _onPublish(req) {
    PubSub.publish(this._pubChannel(req.channel), { type: PUBLISH, channel: req.channel, payload: req.payload });

    this._respond(req, OK);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`----> Publish to '${req.channel}'`);
    }
  }

  protected _onError(req) {
    this._respond(req, ERROR, { code: req.code, reason: req.reason });
  }

  protected _socketPath(req, ...path): string[] {
    return [req.channel, req.socket.objectId].concat(path);
  }

  protected _channelWeight(req) {
    return this._state.getIn(this._socketPath(req, 'count'), 0);
  }

  protected _pubChannel(subChannel: string) {
    return [SYSTEM_PREFIX, WEBSOCKET_PREFIX, subChannel].join(':');
  }

  protected _subChannel(pubChannel: string) {
    return pubChannel.split(':').slice(-2).join(':');
  }
}
