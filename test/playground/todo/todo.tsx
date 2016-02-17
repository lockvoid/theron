import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Reducer, combineReducers, applyMiddleware, createStore } from 'redux';
import { take, put, call, fork } from 'redux-saga'
import { Provider, MapStateToProps, MapDispatchToPropsFunction, connect } from 'react-redux';
import { List } from 'immutable';
import { Subscription } from 'rxjs/Subscription';

import { Theron } from '../../../app/driver/driver';

// Sagas

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

const store = createStore(combineReducers({ theron, todos }));

// Actions

const connectTheron = (url: string, options: { app: string, secret?: string }) => {
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

  async componentWillMount() {
    const { theron } = this.props;

    // let s = theron.upsertQuery('LIST_TODOS', () => { console.log('query') }).subscribe(
    //    v => console.log(v),
    //    e => console.log(e),
    //    c => console.log('complete')
    // );

    let s = theron.watch('LIST_TODOS', { order: 'name' }).subscribe(
      message => {
        console.log(message);
      }
    );

    setTimeout(() => {
    let s2 = theron.watch('LIST_TODOS', { order: 'name' }).subscribe(
      message => {
        console.log(message);
      }
    );

      //s.unsubscribe();
    }, 2500);
  }

  componentWillUnmount() {
    this._todos.unsubscribe();
  }

  addTodo(event) {
    let { onEnterPress } = this.props;

    if (event.keyCode === 13) {
      onEnterPress(event.target.value);
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

store.dispatch(connectTheron('ws://0.0.0.0:9090/echo', { app: 'todos', secret: '12345' }));

const app = (
  <Provider store={store}>
    <TodoApp />
  </Provider>
);

ReactDOM.render(app, document.getElementById('app'));
