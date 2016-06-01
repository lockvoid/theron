import { Map, Set } from 'immutable';
import { NextObserver, ErrorObserver } from 'rxjs/Observer';
import { AliveWebSocket } from './alive_websocket';
import { PubSub, PUBLISH_QUEUE, RESPOND_QUEUE } from './pub_sub';
import { BaseAction } from './base_action';
import { BaseRequest } from './base_request';
import { CONNECT, DISCONNECT, SUBSCRIBE, UNSUBSCRIBE } from './constants/actions';

export class SocketHive implements NextObserver<any> {
  protected _channels = Map<string, Set<AliveWebSocket>>();
  protected _sessions = Map<string, AliveWebSocket>();

  constructor() {
    const sub = PubSub.fork();

    sub.on('pmessage', this._broadcast);
    sub.psubscribe(PUBLISH_QUEUE + '*');
    sub.psubscribe(RESPOND_QUEUE + '*');
  }

  next(req) {
    switch (req.type) {
      case CONNECT:
        this._onConnect(req);
        break;

      case DISCONNECT:
        this._onDisconnect(req);
        break;

      case SUBSCRIBE:
        this._onSubscribe(req);
        break;

      case UNSUBSCRIBE:
        this._onUnsubscribe(req);
        break;
    }
  }

  protected _broadcast = (pattern: string, queue: string, message: string): void => {
    const { channel, session, payload } = PubSub.parse(message);

    if (pattern.startsWith(PUBLISH_QUEUE)) {
      this._channels.has(channel) && this._channels.get(channel).forEach((_, socket) => socket.next(payload));
    } else {
      this._sessions.has(session) && this._sessions.get(session).next(payload);
    }
  }

  protected _onConnect({ socket }): void {
    this._addSession(socket);
  }

  protected _onDisconnect({ socket }): void {
    this._removeSession(socket);
  }

  protected _onSubscribe({ app, socket, channel }): void {
    this._addChannel(socket, this._appChannel(app, channel));
  }

  protected _onUnsubscribe({ app, socket, channel }): void {
    this._removeChannel(socket, this._appChannel(app, channel));
  }

  protected _addSession(socket: AliveWebSocket): void {
    this._sessions = this._sessions.set(socket.id, socket);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`HIVE: Add socket '${socket.id}'`);
    }
  }

  protected _removeSession(socket: AliveWebSocket): void {
    this._sessions = this._sessions.delete(socket.id);

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`HIVE: Remove socket '${socket.id}'`);
    }
  }

  protected _addChannel(socket: AliveWebSocket, channel: string): void {
    this._channels = this._channels.update(channel, Set<AliveWebSocket>(), sockets => sockets.add(socket));

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`HIVE: Add socket '${socket.id}' to channel '${channel}'`);
    }
  }

  protected _removeChannel(socket: AliveWebSocket, channel: string): void {
    this._channels = this._channels.update(channel, Set<AliveWebSocket>(), sockets => sockets.delete(socket));

    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log(`HIVE: Remove socket '${socket.id}' from channel '${channel}'`);
    }
  }

  protected _appChannel(app, channel: string): string {
    return PubSub.sanitize(app.id, channel);
  }
}
