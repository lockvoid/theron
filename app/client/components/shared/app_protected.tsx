import * as React from 'react';

import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { AppHeader } from './app_header';
import { AppSpinner } from '../../../../lib/components/app_spinner';

const stateToProps = (state) => {
  return state;
}

const dispatchToProps = (dispatch: Dispatch) => {
  return {
  }
}

@connect(stateToProps, dispatchToProps)
export class AppProtected extends React.Component<any, any> {
  render() {
    let { children } = this.props;

    return (
      <div className="protected">
        <AppHeader apps={[]} />
        <main>{children}</main>
      </div>
    );
  }
}
