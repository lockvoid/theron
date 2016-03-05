import * as React from 'react';

import { Dispatch } from 'redux';
import { reduxForm } from 'redux-form';
import { combineValidators, requiredValidator, slugValidator, uniquenessValidator } from '../../utils/validators';
import { createApp } from '../../actions/index';
import { FieldBox } from '../shared/field_box';
import { SubmitButton } from '../shared/submit_button';

const formConfig = {
  form: 'app',

  fields: [
    'name'
  ],

  validate: combineValidators({
    name: [
      requiredValidator, slugValidator
    ],
  }),

  asyncBlurFields: [
    'name'
  ],

  asyncValidate: uniquenessValidator('name', (name, { auth: { api } }) => api.isAppUniqueness(name)),
}

const mapStateToProps = (state: any) => {
  return state;
}

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    onSubmit: (payload) => new Promise((resolve, reject) => {
      dispatch(createApp(payload, resolve, reject))
    }),
  }
}

@reduxForm(formConfig, mapStateToProps, mapDispatchToProps)
export class NewApp extends React.Component<any, any> {
  render() {
    const { fields: { name }, asyncValidating, handleSubmit, submitting, error } = this.props;

    return (
      <div className="apps new">
        <header className="default">
          <h1>Create a new application</h1>
        </header>

        <wrapper>
          <form className="default" onSubmit={handleSubmit}>
            {error && !submitting && <div className="alert danger">{error}</div>}

            <FieldBox {...name}>
              <div className="title">App Name {asyncValidating === 'name' && <span className="async">Checking</span>}</div>
              <input type="text" {...name} />
            </FieldBox>

            <div className="buttons">
              <SubmitButton title="Continue" submitting={submitting} />
            </div>
          </form>
        </wrapper>
      </div>
    );
  }
}
