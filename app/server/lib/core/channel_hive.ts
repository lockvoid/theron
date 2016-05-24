import * as codes from '../../../../lib/constants';

import { Map, Set } from 'immutable';
import { NextObserver, ErrorObserver } from 'rxjs/Observer';
import { PubSub } from './pub_sub';
import { SocketResponder } from './socket_responder';
import { DISCONNECT, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH, SYSTEM_PREFIX, WEBSOCKET_PREFIX } from '../../../../lib/constants';

export class ChannelHive extends SocketResponder implements NextObserver<any>, ErrorObserver<any> {
  protected _state = Map<string, Map<string, Map<string, any>>>();  /* { [channel: string]: { [socket: string]: { socket: WebSocket, tokens: Set<string> } } } */
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
    this._state = this._state.updateIn(this._channelPath(req), Map({ socket: req.socket, tokens: Set() }), socket =>
      socket.update('tokens', tokens => tokens.add(req.token))
    );

    this._respond(req, OK, { channel: req.channel, token: req.token });

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      const observersCount = this._state.getIn(this._channelPath(req, 'tokens'), Set()).count();
      console.log(`----> Socket '${req.socket.objectId}' subscribed to '${req.channel}' with ${observersCount} observers`);
    }
  }

  protected _onUnsubscribe(req) {
    this._state = this._state.updateIn(this._channelPath(req), Map({ socket: req.socket, tokens: Set() }), socket =>
      socket.update('tokens', tokens => tokens.delete(req.token))
    );

    this._respond(req, OK, { channel: req.channel });

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      const observersCount = this._state.getIn(this._channelPath(req, 'tokens'), Set()).count();
      console.log(`----> Socket '${req.socket.objectId}' unsubscribed from '${req.channel}' with ${observersCount} observers`);
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

  protected _channelPath(root: { channel: string, socket: { objectId: string } }, ...path): string[] {
    return [root.channel, root.socket.objectId].concat(path);
  }

  protected _pubChannel(subChannel: string) {
    return [SYSTEM_PREFIX, WEBSOCKET_PREFIX, subChannel].join(':');
  }

  protected _subChannel(pubChannel: string) {
    return pubChannel.split(':').slice(-2).join(':');
  }
}
