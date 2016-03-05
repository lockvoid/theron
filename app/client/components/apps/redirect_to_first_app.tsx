import * as React from 'react';

import { connect, MapDispatchToPropsObject  } from 'react-redux';
import { Dispatch } from 'redux';
import { redirectToFirstApp } from '../../actions/index';

const dispatchToProps: MapDispatchToPropsObject = {
  redirectToFirstApp
}

@connect(null, dispatchToProps)
export class RedirectToFirstApp extends React.Component<any, any> {
  componentWillMount() {
    this.props.redirectToFirstApp();
  }

  render() {
    return null;
  }
}
