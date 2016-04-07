import * as React from 'react';

import { connect, MapStateToProps, MapDispatchToPropsObject } from 'react-redux';
import { Dispatch } from 'redux';
import { AppHeader } from './app_header';
import { AppSpinner } from '../../../../lib/components/app_spinner';
import { watchApps, unwatchApps } from '../../actions/index';

const stateToProps: MapStateToProps = (state) => {
  return state;
}

const dispatchToProps: MapDispatchToPropsObject = {
  watchApps, unwatchApps
}

@connect(stateToProps, dispatchToProps)
export class AppProtected extends React.Component<any, any> {
  componentWillMount() {
    this.props.watchApps();
  }

  componentWillUnmount() {
    this.props.unwatchApps();
  }

  render() {
    let { children, apps } = this.props;

    if (!apps.meta.initialized) {
      return <AppSpinner />;
    }

    return (
      <div className="protected">
        <AppHeader apps={apps} />
        <main>{children}</main>
      </div>
    );
  }
}
