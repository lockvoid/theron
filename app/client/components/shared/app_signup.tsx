import * as React from 'react';

import { Dispatch } from 'redux';
import { Link } from 'react-router';
import { MapStateToProps, MapDispatchToPropsFunction } from 'react-redux';
import { reduxForm } from 'redux-form';
import { signup } from '../../actions/index';
import { combineValidators, requiredValidator, emailValidator, passwordValidator, uniquenessValidator } from '../../utils/validators';
import { FieldBox, FieldError } from './fieldbox';
import { SubmitButton } from './submit_button';
import { AppSpinner } from '../../../../lib/components/app_spinner';
import { Api } from '../../lib/api';

const formConfig = {
  form: 'signup',

  fields: [
    'email', 'password', 'name'
  ],

  validate: combineValidators({
    email: [
      requiredValidator, emailValidator
    ],

    password: [
      requiredValidator, passwordValidator
    ],

    name: [
      requiredValidator
    ],
  }),

  asyncBlurFields: [
    'email'
  ],

  asyncValidate: uniquenessValidator('email', email => Api.isEmailUniqueness(email)),
}

const stateToProps: MapStateToProps = (state) => {
  return state.auth;
}

const dispatchToProps: MapDispatchToPropsFunction = (dispatch: Dispatch) => {
  return {
    onSubmit: ({ email, password, name }) => new Promise((resolve, reject) => {
      dispatch(signup(email, password, name, resolve, reject));
    }),
  }
}

@reduxForm(formConfig, stateToProps, dispatchToProps)
export class AppSignup extends React.Component<any, any> {
  render() {
    const { fields: { email, password, name }, asyncValidating, handleSubmit, submitting, error } = this.props;

    return (
      <div className="signup">
        <main>
          <a href="/" className="logo">/* @include /public/images/theron.svg */</a>

          <form className="default" onSubmit={handleSubmit}>
            <wrapper>
              {error && !submitting && <div className="alert warning">{error}</div>}

              <FieldBox {...email}>
                <div className="title">Email {asyncValidating === 'email' && <span className="async">Checking</span>}</div>
                <input type="text" {...email} />
              </FieldBox>

              <FieldBox {...password}>
                <div className="title">Password</div>
                <input type="password" {...password} />
              </FieldBox>

              <FieldBox {...name}>
                <div className="title">Name</div>
                <input type="text" {...name} />
              </FieldBox>

              <div className="buttons">
                <SubmitButton title="Sign Up" submitting={submitting} className="justify" />
              </div>
            </wrapper>

            <Link to="/signin" className="footer">
              Already have an account? Sign In
            </Link>
          </form>
        </main>
      </div>
    );
  }
}
