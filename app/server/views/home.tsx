import * as React from 'react';

import { Page } from './layouts/page';
import { assetPath } from '../utils/asset_path';

export default ({ isAuth }) => (
  <Page className="pages">
    <main className="home">
      <header className="main">
        <wrapper>
          <nav className="menu">
            <a href="/" className="logo">/* @include /public/images/theron.svg */</a>

            <ul>
              <li>
                <a href="/docs">Docs</a>
              </li>

              <li>
                {isAuth ? <a href="/">Go to App</a> : <a href="/signin">Sign In</a>}
              </li>
            </ul>
          </nav>

          <div className="intro">
            <h1>Reactive storage for realtime apps.</h1>
            <h2>Stream data avoiding sync pitfalls. With a developer’s touch.</h2>

            <a href="/signup" className="signup">
              <div>Sign Up for Alpha</div>
            </a>
          </div>
        </wrapper>
      </header>


      <section className="features">
        <div className="feature">
          <h4>
            <i>/* @include /public/images/icons/code.svg */</i>
            <span>Plain coding</span>
          </h4>

          <p>There are tons of backend services that claim that developers can focus on apps instead of code. But once the app grows, these services no longer fit the requirements. We believe code controls and infrastructure should stay on the developer side.</p>
        </div>

        <div className="feature">
          <h4>
            <i>/* @include /public/images/icons/storage.svg */</i>
            <span>Native querying</span>
          </h4>

          <p>Databases are the core of any application. Theron uses all of the advantages of SQL databases. It connects directly to the Postgres alongside the server. Put simply, you can continue to write plain queries to fetch and order data.</p>
        </div>

        <div className="feature">
          <h4>
            <i>/* @include /public/images/icons/flash.svg */</i>
            <span>Instant updates</span>
          </h4>

          <p>Depending on the query to the database, Theron understands which data is important and should be distributed, so it sends only payloads: the small artefacts of data needed in order to construct an entire dataset.</p>
        </div>
      </section>

      <section className="video">
        <h3>Watch how to build apps with Theron.</h3>

        <figure className="video">
          <div data-tab="1" className="active">
            <iframe src="//player.vimeo.com/video/159770071?api=1&title=0&byline=0&portrait=0&background=1&player_id=setup_project" id="setup_project"></iframe>
          </div>

          <div data-tab="2">
            <iframe src="//player.vimeo.com/video/159770247?api=1&player_id=build_application&title=0&amp;byline=0&amp;portrait=0&amp;color=ff0179" id="build_application"></iframe>
          </div>

          <div data-tab="3">
            <iframe src="//player.vimeo.com/video/159773083?api=1&player_id=integrate_theron&title=0&amp;byline=0&amp;portrait=0&amp;color=ff0179" id="integrate_theron"></iframe>
          </div>

          <div data-tab="4">
            <iframe src="//player.vimeo.com/video/159773771?api=1&player_id=secure_theron&title=0&amp;byline=0&amp;portrait=0&amp;color=ff0179" id="secure_theron"></iframe>
          </div>
        </figure>

        <footer className="episodes">
          <a data-tab="1" className="episode active">
            <i></i>
            <h5>Setup project</h5>
          </a>

          <a data-tab="2" className="episode">
            <i></i>
            <h5>Build application</h5>
          </a>

          <a data-tab="3" className="episode">
            <i></i>
            <h5>Integrate Theron</h5>
          </a>

          <a data-tab="4" className="episode">
            <i></i>
            <h5>Secure Theron</h5>
          </a>
        </footer>
      </section>

      <footer className="main">
        <wrapper>
          <ul>
            <li>
              <a href="mailto:support@therondb.com">Contact Us</a>
            </li>
          </ul>
        </wrapper>
      </footer>
    </main>

    <script src={assetPath('pages.js')} />
  </Page>
);
