import axios from 'axios';

// Action Types
export const GET_FARM_STATUS = 'GET_FARM_STATUS';
export const FEED_MULTIPLE_CHICKENS = 'FEED_MULTIPLE_CHICKENS';
export const COLLECT_ALL_EGGS = 'COLLECT_ALL_EGGS';
export const BUY_FOOD = 'BUY_FOOD';
export const SET_ERROR = 'SET_ERROR';
export const SET_LOADING = 'SET_LOADING';

// Action Creators
export const getFarmStatus = () => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const [chickensRes, walletRes] = await Promise.all([
      axios.get('/farm/chickens'),
      axios.get('/wallet/balance')
    ]);
    
    dispatch({
      type: GET_FARM_STATUS,
      payload: {
        chickens: chickensRes.data,
        coinBalance: walletRes.data.balance,
        food: walletRes.data.food
      }
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

export const feedMultipleChickens = (chickenIds) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const response = await axios.post('/farm/feed-multiple', { chickenIds });
    dispatch({
      type: FEED_MULTIPLE_CHICKENS,
      payload: response.data
    });
    // รีเฟรชสถานะฟาร์มหลังจากให้อาหาร
    dispatch(getFarmStatus());
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

export const collectAllEggs = () => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const response = await axios.post('/farm/collect-eggs');
    dispatch({
      type: COLLECT_ALL_EGGS,
      payload: response.data
    });
    // รีเฟรชสถานะฟาร์มหลังจากเก็บไข่
    dispatch(getFarmStatus());
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

export const buyFood = (amount) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const response = await axios.post('/farm/buy-food', { amount });
    dispatch({
      type: BUY_FOOD,
      payload: response.data
    });
    // รีเฟรชสถานะฟาร์มหลังจากซื้ออาหาร
    dispatch(getFarmStatus());
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