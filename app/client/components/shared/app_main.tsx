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
  componentWillMount() {
  }

  componentWillUnmount() {
  }

  render() {
    return this.props.children;
  }
}
