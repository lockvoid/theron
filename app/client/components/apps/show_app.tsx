import * as React from 'react';

import { Dispatch } from 'redux';
import { MapStateToProps, MapDispatchToPropsFunction } from 'react-redux';
import { reduxForm } from 'redux-form';
import { combineValidators, requiredValidator, slugValidator, uniquenessValidator } from '../../utils/validators';
import { selectApp, updateApp, deleteApp } from '../../actions/index';
import { FieldBox } from '../shared/field_box';
import { NotFound } from '../shared/not_found';
import { SubmitButton } from '../shared/submit_button';
import { Checkbox } from '../shared/checkbox';

const formConfig = {
  form: 'app',

  fields: [
    'name', 'db_url', 'secret', 'development'
  ],

  validate: combineValidators({
    name: [
      requiredValidator, slugValidator
    ],
  }),

  asyncBlurFields: [
    'name'
  ],

  asyncValidate: uniquenessValidator('name', (name, { api, app: { id } }) => api.isAppUniqueness(name, id)),
}

const mapStateToProps: MapStateToProps = ({ auth: { api }, apps }, { params }) => {
  const app = apps.rows.find(app => app.id === params.appId);

  return { api, app, initialValues: app };
}

const mapDispatchToProps: MapDispatchToPropsFunction = (dispatch: Dispatch, { params }) => {
  return {
    selectApp: (id: number = parseInt(params.appId)) => {
      dispatch(selectApp(id));
    },

    onSubmit: (payload) => new Promise((resolve, reject) => {
      dispatch(updateApp(params.appId, payload, resolve, reject))
    }),

    onDelete: () => {
      if (window.confirm("Do you really want to delete?")) {
        dispatch(deleteApp(params.appId));
      }
    },
  }
}

@reduxForm(formConfig, mapStateToProps, mapDispatchToProps)
export class ShowApp extends React.Component<any, any> {
  componentWillMount() {
    this.props.selectApp();
  }

  componentWillUnmount() {
    this.props.selectApp(null);
  }

  render() {
    const { app, fields: { name, db_url, secret, development }, asyncValidating, handleSubmit, onDelete, submitting, error } = this.props;

    if (!app) {
      return <NotFound />;
    }

    return (
      <div className="apps new">
        <header className="default">
          <h1>{app.name}</h1>
        </header>

        <wrapper>
          <form className="default" onSubmit={handleSubmit}>
            {error && !submitting && <div className="alert failure">{error}</div>}

            <FieldBox {...name}>
              <div className="title">App Name {asyncValidating === 'name' && <span className="async">Checking</span>}</div>
              <input type="text" {...name} />
            </FieldBox>

            <FieldBox {...db_url}>
              <div className="title">Postgress Url</div>
              <input type="text" {...db_url} placeholder="postgres://username:password@host/dbname" />
            </FieldBox>

            <FieldBox {...secret}>
              <div className="title">Secret Key</div>
              <input type="text" {...secret} readOnly={true}/>
            </FieldBox>

            <FieldBox {...development}>
              <Checkbox {...development}>Development?</Checkbox>
              <div className="hint">Uncheck to validate a query signature using a secret key</div>
            </FieldBox>

            <div className="buttons">
              <SubmitButton title="Update" submitting={submitting} />
              <button type="button" className="flat danger end" onClick={onDelete}>Delete</button>
            </div>
          </form>
        </wrapper>
      </div>
    );
  }
}
