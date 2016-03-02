import * as React from 'react';

import { Link } from 'react-router';
import { Dispatch } from 'redux';
import { reduxForm } from 'redux-form';
import { signup } from '../../actions/index';
import { combineValidators, requiredValidator, emailValidator, passwordValidator, emailUniquenessValidator } from '../../utils/validators';
import { FieldBox, FieldError } from './field_box';
import { SubmitButton } from './submit_button';
import { AppSpinner } from '../../../../lib/components/app_spinner';

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

  asyncValidate: emailUniquenessValidator
}

const stateToProps = (state) => {
  return state.auth;
}

const dispatchToProps = (dispatch: Dispatch) => {
  return {
    onSubmit: ({ email, password, name }) => {
      setTimeout(() => {
        dispatch(signup(email, password, name));
      });

      return new Promise(() => {});
    }
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
