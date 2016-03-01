import * as React from 'react';

import { FieldProp } from 'redux-form';

export const FieldError = ({ error, touched }: FieldProp) => (
  <div className="error">
    {error && touched ? error : null}
  </div>
)

export class FieldBox extends React.Component<FieldProp & React.Props<FieldBox>, {}> {
  className(): string {
    const { error, touched } = this.props;

    if (error && touched) {
      return 'field invalid';
    } else {
      return 'field'
    }
  }

  render() {
    const { children } = this.props;

    return (
      <label className={this.className()}>
        {children}
        <FieldError {...this.props} />
      </label>
    );
  }
}
