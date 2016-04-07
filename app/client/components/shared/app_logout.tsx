import * as React from 'react';

import { connect, MapDispatchToPropsFunction } from 'react-redux';
import { Dispatch } from 'redux';

import { logout } from '../../actions/index';

const mapDispatchToProps: MapDispatchToPropsFunction = (dispatch: Dispatch) => {
  return {
    tryLogout: () => {
      dispatch(logout());
    }
  }
}

@connect(null, mapDispatchToProps)
export class AppLogout extends React.Component<any, any> {
  componentDidMount() {
    this.props.tryLogout();
  }

  render() {
    return null;
  }
}
