import { getFarmStatus, feedMultipleChickens, collectAllEggs, buyFoodRedux } from '../../services/api';

// Action Types
export const GET_FARM_STATUS = 'GET_FARM_STATUS';
export const FEED_MULTIPLE_CHICKENS = 'FEED_MULTIPLE_CHICKENS';
export const COLLECT_ALL_EGGS = 'COLLECT_ALL_EGGS';
export const BUY_FOOD = 'BUY_FOOD';
export const SET_ERROR = 'SET_ERROR';
export const SET_LOADING = 'SET_LOADING';

// Action Creators
export const getFarmStatusAction = () => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('token');
    const data = await getFarmStatus(token);
    dispatch({
      type: GET_FARM_STATUS,
      payload: data
    });
  } catch (error) {
    console.error('Error getting farm status:', error);
    dispatch({ 
      type: SET_ERROR, 
      payload: error.response?.data?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลฟาร์ม' 
    });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

export const feedMultipleChickensAction = (chickenIds) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('token');
    const response = await feedMultipleChickens(chickenIds, token);
    dispatch({
      type: FEED_MULTIPLE_CHICKENS,
      payload: response.data
    });
    dispatch(getFarmStatusAction());
  } catch (error) {
    console.error('Error feeding chickens:', error);
    dispatch({ 
      type: SET_ERROR, 
      payload: error.response?.data?.message || 'เกิดข้อผิดพลาดในการให้อาหารไก่' 
    });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

export const collectAllEggsAction = () => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('token');
    const response = await collectAllEggs(token);
    dispatch({
      type: COLLECT_ALL_EGGS,
      payload: response.data
    });
    dispatch(getFarmStatusAction());
  } catch (error) {
    console.error('Error collecting eggs:', error);
    dispatch({ 
      type: SET_ERROR, 
      payload: error.response?.data?.message || 'เกิดข้อผิดพลาดในการเก็บไข่' 
    });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

export const buyFoodAction = (amount) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('token');
    const response = await buyFoodRedux(amount, token);
    dispatch({
      type: BUY_FOOD,
      payload: response.data
    });
    dispatch(getFarmStatusAction());
  } catch (error) {
    console.error('Error buying food:', error);
    dispatch({ 
      type: SET_ERROR, 
      payload: error.response?.data?.message || 'เกิดข้อผิดพลาดในการซื้ออาหาร' 
    });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
}; 