import * as React from 'react';

import { connect } from 'react-redux';
import { Link } from 'react-router';
import { Dispatch } from 'redux';
import { signin, logout } from '../../actions/index';

const stateToProps = (state) => {
  return state;
}

const dispatchToProps = (dispatch: Dispatch) => {
  return {
    tryLogin: () => {
      dispatch(signin('kochnev.d@gmail.com', 'qazwsxedc'));
    },

    tryLogout: () => {
      dispatch(logout());
    },
  }
}

@connect(stateToProps, dispatchToProps)
export class AppSignup extends React.Component<any, any> {
  render() {
    let { tryLogin, tryLogout } = this.props;

    return (
      <div className="login">
        <wrap>
          <div>Login</div>
          <button onClick={tryLogin}>Sign In</button>
          <button onClick={tryLogout}>Logout</button>
        </wrap>
      </div>
    );
  }
}
