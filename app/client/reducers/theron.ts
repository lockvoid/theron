import { Reducer } from 'redux';
import { CONNECT_THERON } from '../actions/index';
import { Theron } from '../../../lib/driver/driver';

export const theron: Reducer = (state = null, action) => {
  switch (action.type) {
    case CONNECT_THERON:
      return new Theron(action.url, action.options);
    default:
      return state;
  }
}
