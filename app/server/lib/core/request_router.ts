import * as crypto from 'crypto';

import { Observable } from 'rxjs/Observable';
import { AppRecord } from '../../models/app';
import { Theron } from '../../../../lib/driver/theron';
import { SocketResponder } from './socket_responder';
import { CONNECT, DISCONNECT, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH, SYSTEM_PREFIX } from '../../../../lib/constants';
import { APP_DISCONNECTED, APP_DOES_NOT_EXIST, SERVER_ERROR, BAD_REQUEST, UNAUTHORIZED_REQUEST, MALFORMED_SYNTAX, INVALID_SECRET_KEY } from '../../../../lib/constants';
import { CHANNEL_REGEX } from '../../../../lib/regex';
import { logError } from '../../utils/log_error';

import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/from';

const uuid = require('node-uuid');

export class RequestRouter<T extends { type: string }, R> extends SocketResponder {
  protected _app: any;

  next = (req: T): Observable<R> => {
    if (!this._app && req.type !== CONNECT) {
      throw { code: APP_DISCONNECTED, reason: `App isn't connected` };
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

    return Observable.empty();
  }

  protected async _onConnect(req): Promise<any> {
    try {
      this._app = await AppRecord.query().where('name', req.app).first();
    } catch (err) {
      logError(err);
      throw { code: SERVER_ERROR, reason: `An error has occurred` };
    }

    if (!this._app) {
      throw { code: APP_DOES_NOT_EXIST, reason: `App '${req.app}' doesn't exist` };
    }

    return this._toReqRes(CONNECT, req, { app: this._app });
  }

  protected async _onDisconnect(req): Promise<any> {
    return this._toReqRes(DISCONNECT, req);
  }

  protected async _onSubscribe(req): Promise<any> {
    if (!req.channel && !req.query) {
      return this._toReqRes(ERROR, req, { code: BAD_REQUEST, reason: `Either channel nor query is given` });
    }

    if (req.channel && !this._validateChannel(req.channel)) {
      return this._toReqRes(ERROR, req, { code: MALFORMED_SYNTAX, reason: `Channel '${req.channel}' includes invalid characters` });
    }

    try {
      const signed = await this._isSignedRequest(req.channel || req.query, req.signature);

      if (!signed) {
        return this._toReqRes(ERROR, req, { code: UNAUTHORIZED_REQUEST, reason: `Invalid signature '${req.signature}' for '${req.channel || req.query}'` });
      }
    } catch (err) {
      logError(err);
      return this._toReqRes(ERROR, req, { code: SERVER_ERROR, reason: `An error has occurred` });
    }

    if (req.channel) {
      return this._toReqRes(SUBSCRIBE, req, { token: uuid.v1(), channel: this._toChannel(req.channel) });
    } else {
      return this._toReqRes(SUBSCRIBE, req, { token: uuid.v1(), channel: this._toChannel(true, this._sha256(req.query)), app: this._app, query: req.query });
    }
  }

  protected async _onUnsubscribe(req): Promise<any> {
    if (!req.channel) {
      return this._toReqRes(ERROR, req, { code: BAD_REQUEST, reason: `Channel is required` });
    }

    if (!this._validateChannel(req.channel)) {
      return this._toReqRes(ERROR, req, { code: MALFORMED_SYNTAX, reason: `Channel '${req.channel}' includes invalid characters` });
    }

    return this._toReqRes(UNSUBSCRIBE, req, { token: req.token, channel: req.channel });
  }

  protected async _onPublish(req): Promise<any> {
    if (!this._validateChannel(req.channel)) {
      return this._toReqRes(ERROR, req, { code: MALFORMED_SYNTAX, reason: `Channel '${req.channel}' includes invalid characters` });
    }

    if (this._isSystemChannel(req.channel)) {
      return this._toReqRes(ERROR, req, { code: MALFORMED_SYNTAX, reason: `Channel '${req.channel}' can't start with a reserved prefix 'TN'` });
    }

    try {
      const secret = await this._isSecretRequest(req.secret);

      if (!secret) {
        return this._toReqRes(ERROR, req, { code: INVALID_SECRET_KEY, reason: `Invalid secret key for '${this._app.name}'` });
      }
    } catch (err) {
      logError(err);
      return this._toReqRes(ERROR, req, { code: SERVER_ERROR, reason: `An error has occurred` });
    }

    return this._toReqRes(PUBLISH, req, { channel: this._toChannel(req.channel), payload: req.payload || {} });
  }

  protected _refetchApp(): Promise<any> {
    return AppRecord.query().where('id', this._app.id).first();
  }

  protected _toChannel(system: boolean | string, ...parts: string[]): string {
    if (system === true) {
      var channel = [SYSTEM_PREFIX, this._app.id].concat(parts);
    } else {
      var channel = [this._app.id].concat(system, parts);
    }

    return channel.map(part => this._sanitizeChannel(part)).join(':');
  }

  protected _sanitizeChannel(channel): string {
    return String(channel);
  }

  protected _validateChannel(channel): boolean {
    return CHANNEL_REGEX.test(this._sanitizeChannel(channel));
  }

  protected async _isSignedRequest(data, signature): Promise<boolean> {
    const app = await this._refetchApp();

    if (app.development) {
      return true;
    } else {
      return Theron.sign(data, app.secret) === signature;
    }
  }

  protected async _isSecretRequest(secret): Promise<boolean> {
    const app = await this._refetchApp();

    if (app.development) {
      return true;
    } else {
      return app.secret === secret;
    }
  }

  protected _isSystemChannel(channel): boolean {
    return this._sanitizeChannel(channel).startsWith(SYSTEM_PREFIX + ':');
  }

  protected _sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
