import * as React from 'react';

import { MapStateToProps, MapDispatchToPropsFunction, connect } from 'react-redux';

const mapStateToProps: MapStateToProps = (state) => {
  return state;
}

const mapDispatchToProps: MapDispatchToPropsFunction = (dispatch) => {
  return {
  }
}

@connect(mapStateToProps, mapDispatchToProps)
export class AppMain extends React.Component<any, any> {
  private _subscription: any;

  componentWillMount() {
    const { theron } = this.props;

    let headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    let body = JSON.stringify({
      email: 'kochnev.d@gmail.com',
      password: 'qazwsxedc'
    });

    fetch('/api/auth', { method: 'post', headers, body }).then(res => res.json()).then(({ token }) => {
      theron.setAuth({ headers: { 'x-jwt-token': token } });

      this._subscription = theron.watch('/api/apps', { order: 'name' }).subscribe(
        message => {
          console.log(message);
        },

        error => {
          console.log(error);
        }
      );

      setTimeout(() => {
        let s2 = theron.watch('/api/apps', { order: 'name' }).subscribe(
          message => {
            console.log(message);
          },

          error => {
            console.log(error);
          }
        );
      }, 2000);

      setTimeout(() => {
        let s2 = theron.watch('/api/apps', { order: 'name' }).subscribe(
          message => {
            console.log(message);
          },

          error => {
            console.log(error);
          }
        );
      }, 20000);
    });
  }

  componentWillUnmount() {
    this._subscription.unsubscribe();
  }

  render() {
    return this.props.children;
  }
}
