import * as crypto from 'crypto';

import { Observable } from 'rxjs/Observable';
import { AppRecord } from '../../models/app';
import { Theron } from '../../../../lib/driver/theron';
import { CONNECT, DISCONNECT, OK, ERROR, SUBSCRIBE, UNSUBSCRIBE, PUBLISH } from '../../../../lib/constants';
import { CHANNEL_REGEX } from '../../../../lib/regex';
import { logError } from '../../utils/log_error';

import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/from';

export class RequestReducer<T extends { type: string }, R> {
  static SYSTEM_NAMESPACE = 'TN:';

  protected _app: any;

  next = (req: T): Observable<R> => {
    if (!this._app && req.type !== CONNECT) {
      throw { code: 3403, reason: `App isn't connected` };
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
      this._app.objectId = this._sha256(this._app.id);
    } catch (err) {
      logError(err);
      throw { code: 3500, reason: `An error has occurred` };
    }

    if (!this._app) {
      throw { code: 3404, reason: `App '${req.app}' doesn't exist` };
    }

    return this._request(CONNECT, req);
  }

  protected async _onDisconnect(req): Promise<any> {
    return this._request(DISCONNECT, req);
  }

  protected async _onSubscribe(req): Promise<any> {
    if (!req.channel && !req.query) {
      return this._request(ERROR, req, { code: 3400, reason: `Either channel nor query is given` });
    }

    if (!this._app.development && Theron.sign(req.channel || req.query, this._app.secret) !== req.signature) {
      return this._request(ERROR, req, { code: 3403, reason: `Invalid signature '${req.signature}' for '${req.channel || req.query}'` });
    }

    if (req.channel && !this._validateChannel(req.channel)) {
      return this._request(ERROR, req, { code: 3400, reason: `Channel '${req.channel}' includes invalid characters` });
    }

    if (req.channel) {
      return this._request(SUBSCRIBE, req, { channel: this._channel(req.channel) });
    } else {
      return this._request(SUBSCRIBE, req, { channel: this._channel(this._sha256(req.query)) });
    }
  }

  protected async _onUnsubscribe(req): Promise<any> {
    if (!req.channel) {
      return this._request(ERROR, req, { code: 3400, reason: `Channel is required` });
    }

    if (!this._validateChannel(req.channel)) {
      return this._request(ERROR, req, { code: 3400, reason: `Channel '${req.channel}' includes invalid characters` });
    }

    return this._request(UNSUBSCRIBE, req, { channel: req.channel });
  }

  protected async _onPublish(req): Promise<any> {
    if (this._isSystemChannel(req.channel)) {
      return this._request(ERROR, req, { code: 3403, reason: `Channel '${req.channel}' can't start with a reserved prefix 'TN'` });
    }

    if (!this._validateChannel(req.channel)) {
      return this._request(ERROR, req, { code: 3400, reason: `Channel '${req.channel}' includes invalid characters` });
    }

    if (!this._app.development && this._app.secret !== req.secret) {
      return this._request(ERROR, req, { code: 3403, reason: `Invalid secret key for '${this._app.name}'` });
    }

    return this._request(PUBLISH, req, { channel: this._channel(req.channel), payload: req.payload || {} });
  }

  protected _request(type: string, { id }, req?) {
    return Object.assign({}, req, { type, id });
  }

  protected _channel(...parts: string[]): string {
    return [this._app.objectId].concat(parts.map(part => this._sanitizeChannel(part))).join(':');
  }

  protected _sanitizeChannel(channel): string {
    return String(channel);
  }

  protected _validateChannel(channel): boolean {
    return CHANNEL_REGEX.test(this._sanitizeChannel(channel));
  }

  protected _isSystemChannel(channel): boolean {
    return this._sanitizeChannel(channel).startsWith(RequestReducer.SYSTEM_NAMESPACE);
  }

  protected _sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}