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

    this._subscription = theron.watch('/api/apps', { order: 'name' }).subscribe(
      message => {
        console.log(message);
      },

      error => {
        console.log(error);
      }
    );

    let s2 = theron.watch('/api/apps', { order: 'name' }).subscribe(
      message => {
        console.log(message);
      },

      error => {
        console.log(error);
      }
    );

    setTimeout(() => {
      this._subscription.unsubscribe();
    }, 3000);

    setTimeout(() => {
      s2.unsubscribe();
    }, 6000);

  }

  componentWillUnmount() {
    this._subscription.unsubscribe();
  }

  render() {
    return this.props.children;
  }
}
