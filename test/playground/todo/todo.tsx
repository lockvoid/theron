import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Reducer, combineReducers, createStore, compose } from 'redux';
import { Provider, MapStateToProps, MapDispatchToPropsFunction, connect } from 'react-redux';
import { List } from 'immutable';

import { Theron } from '../../../app/driver/driver';

const TODO_ADDED = 'TODO_ADDED';

const todos: Reducer = (state: List<TodoRecord> = List([{ name: 'Go shopping...' }]), action) =>  {
  switch (action.type) {
    case TODO_ADDED:
      return state.unshift({ name: action.name });
    default:
      return state;
  }
}

const addTodo = (name: string) => {
  return { type: TODO_ADDED, name };
}

interface TodoRecord {
  name: string;
}

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

        <input className="material" type="text" onKeyUp={this.addTodo.bind(this)} />

        <TodoList {...this.props} />
      </main>
    );
  }
}

const store = createStore(combineReducers({ todos }));

const bootstrap = (
  <Provider store={store}>
    <TodoApp />
  </Provider>
);

ReactDOM.render(bootstrap, document.getElementById('app'));
