import * as React from 'react';

import { Link } from 'react-router';

export class AppHeader extends React.Component<any, any> {
  render() {
    return (
      <header className="app">
        <Link to="/" className="logo">/* @include /public/images/theron.svg */</Link>

        <nav className="account">
          <Link to="/logout">
            <div>Logout</div>
          </Link>
        </nav>
      </header>
    );
  }
}
