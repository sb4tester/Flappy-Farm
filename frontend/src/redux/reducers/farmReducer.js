import {
  GET_FARM_STATUS,
  FEED_MULTIPLE_CHICKENS,
  COLLECT_ALL_EGGS,
  BUY_FOOD,
  SET_ERROR,
  SET_LOADING
} from '../actions/farmActions';

const initialState = {
  chickens: [],
  food: 0,
  coinBalance: 0,
  loading: false,
  error: null
};

const farmReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_FARM_STATUS:
      return {
        ...state,
        ...action.payload,
        loading: false,
        error: null
      };

    case FEED_MULTIPLE_CHICKENS:
      return {
        ...state,
        food: state.food - (action.payload.chickenIds.length * 10),
        loading: false,
        error: null
      };

    case COLLECT_ALL_EGGS:
      return {
        ...state,
        loading: false,
        error: null
      };

    case BUY_FOOD:
      return {
        ...state,
        food: state.food + action.payload.amount,
        coinBalance: state.coinBalance - action.payload.cost,
        loading: false,
        error: null
      };

    case SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    default:
      return state;
  }
};

export default farmReducer; 