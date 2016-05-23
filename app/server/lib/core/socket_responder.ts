export abstract class SocketResponder {
  protected _respond(req, type: string, res?) {
    req.socket.next(this._toReqRes(type, req, res));
  }

  protected _toReqRes(type: string, { id }, res?) {
    return Object.assign({}, res, { type, id });
  }
}
