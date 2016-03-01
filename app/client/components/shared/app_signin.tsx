import * as React from 'react';

import { Link } from 'react-router';
import { Dispatch } from 'redux';
import { reduxForm } from 'redux-form';
import { signin, logout } from '../../actions/index';
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
    onSubmit: ({ email, password }) => {
      setTimeout(() => {
        dispatch(signin(email, password));
      });

      return new Promise(() => {});
    }
  }
}

@reduxForm(formConfig, stateToProps, dispatchToProps)
export class AppSignin extends React.Component<any, any> {
  render() {
    const { fields: { email, password }, handleSubmit, submitting, error } = this.props;

    return (
      <div className="signin">
        <a href="/" className="logo">/* @include /public/images/theron.svg */</a>

        <form className="app" onSubmit={handleSubmit}>
          <div className="wrapper">
            {error && <div className="alert warning">{error}</div>}

            <FieldBox {...email}>
              <div className="label">Email</div>
              <input type="text" {...email} />
            </FieldBox>

            <FieldBox {...password}>
              <div className="label">Password</div>
              <input type="password" {...password} />
            </FieldBox>

            <div className="buttons">
              <SubmitButton title="Sign In" submitting={submitting} className="justify" />
            </div>
          </div>

          <Link to="/signup" className="footer">
            New to Theron? Sign Up
          </Link>
        </form>
      </div>
    );
  }
}
