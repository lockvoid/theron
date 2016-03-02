import { FetchError } from './fetch_error';

export const DEFAULT_HEADERS: { [key: string]: string } = { 'Accept': 'application/json', 'Content-Type': 'application/json' };

export class Api {
  static createToken(email: string, password: string) {
    const body = Api.stringify({ email, password });

    return fetch('/api/tokens', { method: 'post', headers: DEFAULT_HEADERS, body }).then(Api.checkStatus).then(Api.parseResponse);
  }

  static createUser(email: string, password: string, name: string) {
    const body = Api.stringify({ email, password, name });

    return fetch('/api/users', { method: 'post', headers: DEFAULT_HEADERS, body }).then(Api.checkStatus).then(Api.parseResponse);
  }

  static async checkStatus(res) {
    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    try {
      var { reason } = await Api.parseResponse(res);
    } catch (error) {
      var reason = res.statusText;
    }

    throw new FetchError(res.status, reason);
  }

  static parseResponse(res) {
    return res.json();
  }

  static stringify(body) {
    return JSON.stringify(body);
  }
}
