import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Reducer, combineReducers, applyMiddleware, createStore } from 'redux';
import { Provider, MapStateToProps, MapDispatchToPropsFunction, connect } from 'react-redux';
import { List } from 'immutable';
import { Subscription } from 'rxjs/Subscription';

import { Theron } from '../../../app/driver/driver';
import { TheronQueryObservable } from '../../../app/driver/query_observable';

// Records

interface TodoRecord {
  name: string;
}

// Constants

const CONNECT_THERON = 'CONNECT_THERON';
const TODO_ADDED = 'TODO_ADDED';

// Reducers

const theron: Reducer = (state = null, action) => {
  switch (action.type) {
    case CONNECT_THERON:
      return new Theron(action.url, action.options);
    default:
      return state;
  }
}

const todos: Reducer = (state: List<TodoRecord> = List([{ name: 'Go shopping...' }]), action) =>  {
  switch (action.type) {
    case TODO_ADDED:
      return state.unshift({ name: action.name });
    default:
      return state;
  }
}

// Actions

const connectTheron = (url: string, options: { app: string }) => {
  return { type: CONNECT_THERON, url, options };
}

const addTodo = (name: string) => {
  return { type: TODO_ADDED, name };
}

// Components

const TodoList = ({ todos }) => (
  <ul>
    {todos.map(todo => <li key={Math.random()}>{todo.name}</li>)}
  </ul>
);

const mapStateToProps: MapStateToProps = (state) => {
  return state;
}

const mapDispatchToProps: MapDispatchToPropsFunction = (dispatch) => {
  return {
    onEnterPress: (name) => {
      dispatch(addTodo(name));
    }
  }
}

@connect(mapStateToProps, mapDispatchToProps)
class TodoApp extends React.Component<any, any> {
  private _todos: Subscription;

  componentWillMount() {
    const { theron } = this.props;

    this._todos = theron.query({}).subscribe(value => {
      console.log(value);
    });
  }

  componentWillUnmount() {
    this._todos.unsubscribe();
  }

  addTodo(event) {
    if (event.keyCode === 13) {
      this.props.onEnterPress(event.target.value);
      event.target.value = null;
    }
  }

  render() {
    let { todos } = this.props;

    return (
      <main>
        <h1>Todos</h1>

        <input className="material" type="text" onKeyUp={this.addTodo.bind(this)} placeholder="What needs to be done?" />

        <TodoList {...this.props} />
      </main>
    );
  }
}

const store = createStore(combineReducers({ theron, todos }));

store.dispatch(connectTheron('ws://0.0.0.0:9090/echo', { app: 'todos' }));

const bootstrap = (
  <Provider store={store}>
    <TodoApp />
  </Provider>
);

ReactDOM.render(bootstrap, document.getElementById('app'));
