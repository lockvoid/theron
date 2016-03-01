export class Api {
//   authenticate() {
//
//   }
//
//   protected _fetch(endpoint: string, options) {
//     const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
//
//     return fetch('/api/auth', { method: 'post', headers, body }).then(this._checkStatus).then(this._parseJson)
//   }
//
//   protected _checkStatus(response) {
//     if (response.status >= 200 && response.status < 300) {
//       return response;
//     }
//
//     const error = new Error(response.statusText);
//     throw error;
//   }
//
//   protected _parseJSON(response) {
//     return response.json()
//   }
}
