import * as React from 'react';

import { Link } from 'react-router';

export class AppHeader extends React.Component<any, any> {
  render() {
    const { apps } = this.props;

    return (
      <header className="primary">
        <Link to="/" className="logo">/* @include /public/images/theron.svg */</Link>

        <nav className="actions">
          <Link to="/apps/new" activeClassName="active" className="new">
            /* @include /public/images/icons/plus.svg */ <div>New App</div>
          </Link>
        </nav>

        <nav className="apps">
          <wrapper>
            {
              apps.rows.map(app =>
                <Link to={`/apps/${app.id}`} key={app.id} activeClassName="active">
                  <div>{app.name}</div>
                </Link>
              )
            }
          </wrapper>
        </nav>

        <nav className="account">
          <Link to="/logout">
            <div>Logout</div>
          </Link>
        </nav>
      </header>
    );
  }
}
