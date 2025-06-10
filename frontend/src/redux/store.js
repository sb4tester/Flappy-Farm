import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import farmReducer from './reducers/farmReducer';

const rootReducer = combineReducers({
  farm: farmReducer
});

const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);

export default store; 