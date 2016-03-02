import * as React from 'react';

export interface AppSpinnerProps extends React.Props<AppSpinner> {
  active?: boolean
}

export class AppSpinner extends React.Component<AppSpinnerProps, {}> {
  render() {
    const { active } = this.props;

    if (active === false) {
      return null;
    }

    return (
      <spinner>
        <div /><div /><div />
      </spinner>
    );
  }
}
