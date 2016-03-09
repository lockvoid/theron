import * as React from 'react';

import { Link } from 'react-router';
import { Dispatch } from 'redux';
import { reduxForm } from 'redux-form';
import { signin } from '../../actions/index';
import { combineValidators, requiredValidator, emailValidator, passwordValidator } from '../../utils/validators';
import { FieldBox, FieldError } from './field_box';
import { SubmitButton } from './submit_button';

const formConfig = {
  form: 'signin',

  fields: [
    'email', 'password'
  ],

  validate: combineValidators({
    email: [
      requiredValidator, emailValidator
    ],

    password: [
      requiredValidator, passwordValidator
    ],
  }),
}

const stateToProps = (state) => {
  return state.auth;
}

const dispatchToProps = (dispatch: Dispatch) => {
  return {
    onSubmit: ({ email, password }) => new Promise((resolve, reject) => {
      dispatch(signin(email, password, resolve, reject));
    }),
  }
}

@reduxForm(formConfig, stateToProps, dispatchToProps)
export class AppSignin extends React.Component<any, any> {
  render() {
    const { fields: { email, password }, handleSubmit, submitting, error } = this.props;

    return (
      <div className="signin">
        <main>
          <a href="/" className="logo">/* @include /public/images/theron.svg */</a>

          <form className="default" onSubmit={handleSubmit}>
            <wrapper>
              {error && !submitting && <div className="alert warning">{error}</div>}

              <FieldBox {...email}>
                <div className="title">Email</div>
                <input type="text" {...email} />
              </FieldBox>

              <FieldBox {...password}>
                <div className="title">Password</div>
                <input type="password" {...password} />
              </FieldBox>

              <div className="buttons">
                <SubmitButton title="Sign In" submitting={submitting} className="justify" />
              </div>
            </wrapper>

            <Link to="/signup" className="footer">
              New to Theron? Sign Up
            </Link>
          </form>
        </main>
      </div>
    );
  }
}
