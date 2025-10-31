import axios from 'axios';

// ✅ ตรวจสอบ API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
console.log('🔧 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Enhanced interceptor with better error handling
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      console.warn('🔐 Unauthorized - redirecting to /register');
      localStorage.removeItem('token');
      // Uncomment if you want auto redirect
      // window.location.href = '/register';
    }
    
    return Promise.reject(error);
  }
);

// Helper for auth header
function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

// 🔐 Auth APIs
const loginWithToken = (idToken, referrer = null) => {
  console.log('📤 Sending login request with token:', idToken?.substring(0, 20) + '...');
  return api.post('/auth/login', { idToken, referrer });
};

const registerUser = (idToken, userData) => {
  console.log('📤 Sending register request:', userData);
  return api.post('/auth/register', { idToken, ...userData });
};

// 👤 User APIs
const getUserProfile = (token) =>
  api.get('/user/profile', { headers: bearer(token) });

const updateUserProfile = (userData, token) =>
  api.put('/user/profile', userData, { headers: bearer(token) });

// Farm APIs
const getChickens = (token) => api.get('/farm/chickens', { headers: bearer(token) });
const buyMother = (data, token) => api.post('/farm/buy-mother', data, { headers: bearer(token) });
const feedChicken = async (id, token) => {
  const response = await api.post(`/farm/feed/${id}`, {}, { headers: bearer(token) });
  // โหลดข้อมูลไก่ใหม่หลังจากให้อาหาร
  const chickensResponse = await getChickens(token);
  return { ...response, chickens: chickensResponse.data.chickens };
};
const feedMultipleChickens = async (chickenIds, token) => {
  const response = await api.post('/api/farm/feed-multiple', { chickenIds }, {
    headers: bearer(token)
  });

  const chickensResponse = await getChickens(token);
  return { ...response, chickens: chickensResponse.data.chickens };
}

const sellChickensToSystem = async (quantity, token) => {
  const response = await api.post('/api/farm/sell?type=system', { quantity }, {
    headers: bearer(token)
  });

  const chickensResponse = await getChickens(token);
  return { ...response, chickens: chickensResponse.data.chickens };
};



// Wallet APIs
const getBalance = (token) => api.get('/wallet/balance', { headers: bearer(token) });
const deposit = (data, token) => api.post('/wallet/deposit', data, { headers: bearer(token) });
const withdraw = (data, token) => api.post('/wallet/withdraw', data, { headers: bearer(token) });
const getDepositAddress = (token) => api.get('/wallet/deposit-address', { headers: bearer(token) });
const getDepositTransactions = (token, limit = 50) =>
  api.get(`/wallet/transactions/deposit?limit=${limit}`, { headers: bearer(token) });

// Eggs APIs
const getEggs = (token) => api.get('/eggs', { headers: bearer(token) });
const claimEgg = (token) => api.post('/eggs/claim', null, { headers: bearer(token) });
const sellEggs = (data, token) => api.post('/eggs/sell', data, { headers: bearer(token) });

// Food APIs
const getFood = async (token) => {
  const res = await getUserProfile(token);
  return { data: { food: res.data.food } };
};

const buyFood = (data, token) => api.post('/food/buy', data, { headers: bearer(token) });

// Incubator APIs
const getIncubators = (token) => api.get('/incubator/list', { headers: bearer(token) });
const buyIncubator = (token) => api.post('/incubator/buy', {}, { headers: bearer(token) });
const insertToIncubator = (data, token) => api.post('/incubator/insert', data, { headers: bearer(token) });

// Chicks APIs
const getChicks = (token) => api.get('/chicks', { headers: bearer(token) });
const feedChick = (id, token) => api.post(`/chicks/feed/${id}`, null, { headers: bearer(token) });
const sellChick = (id, token) => api.post(`/chicks/sell/${id}`, null, { headers: bearer(token) });

// Market APIs
const listMarketOrders = (token) => api.get('/api/market/chicken/listings', { headers: bearer(token) });
const sellToMarket = (chickenId, price, token) => api.post(`/api/market/chicken/${chickenId}/list`, { price }, { headers: bearer(token) });

// Referral APIs
const getReferralTree = (token) => api.get('/referral/tree', { headers: bearer(token) });

// Promotions APIs
const getPromotionStatistics = () => api.get('/promotions/statistics');
const getMotherTierPrice = () => api.get('/promotions/mother-tier-price');

// Farm Redux APIs
const getFarmStatus = async (token) => {
  const [chickensRes, walletRes] = await Promise.all([
    api.get('/farm/chickens', { headers: bearer(token) }),
    api.get('/wallet/balance', { headers: bearer(token) })
  ]);
  return {
    chickens: chickensRes.data,
    coinBalance: walletRes.data.coin_balance,
    food: walletRes.data.food
  };
};
/*
const feedMultipleChickens = (chickenIds, token) =>
  api.post('/farm/feed-multiple', { chickenIds }, { headers: bearer(token) });
*/

const collectAllEggs = (token) =>
  api.post('/farm/collect-eggs', {}, { headers: bearer(token) });

const buyFoodRedux = (amount, token) =>
  api.post('/farm/buy-food', { amount }, { headers: bearer(token) });

// Market functions
const buyFromMarket = (orderId, token) => {
  return api.post(`/api/market/chicken/${orderId}/buy`, null, { headers: bearer(token) });
};

const cancelChickenListing = (orderId, token) => {
  return api.delete(`/api/market/chicken/${orderId}/cancel`, { headers: bearer(token) });
};

const getUserSettings = (token) => {
  return api.get('/user/settings', { headers: bearer(token) });
};

const updateUserSettings = (data, token) => {
  return api.post('/user/settings', data, { headers: bearer(token) });
};


// 🔧 Enhanced Auth Helper Functions
const authAPI = {
  register: async (user, referralCode = '') => {
    try {
      console.log('📝 Starting user registration...');
      const idToken = await user.getIdToken(true);
      console.log('🎫 Got ID token for registration');
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        referralCode: referralCode || null
      };
      console.log('📤 Sending registration data:', userData);
      const response = await registerUser(idToken, userData);
      localStorage.setItem('token', idToken);
      console.log('✅ Registration successful, token stored');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Register API failed:', error);
      let errorMessage = 'Registration failed';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      else if (error.message) errorMessage = error.message;
      return { success: false, error: errorMessage };
    }
  },

  login: async (user, referralCode = '') => {
    try {
      console.log('🔑 Starting user login...');
      const idToken = await user.getIdToken(true);
      console.log('🎫 Got ID token for login');
      const response = await loginWithToken(idToken, referralCode);
      localStorage.setItem('token', idToken);
      console.log('✅ Login successful, token stored');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Login API failed:', error);
      let errorMessage = 'Login failed';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      else if (error.message) errorMessage = error.message;
      return { success: false, error: errorMessage };
    }
  },

  socialAuth: async (user, referralCode = '', isNewUser = false) => {
    try {
      console.log(`🌐 Starting social auth... isNewUser: ${isNewUser}`);
      const idToken = await user.getIdToken(true);
      console.log('🎫 Got ID token for social auth');
      let response; let authType;
      if (isNewUser) {
        console.log('📝 Using register API for new user');
        const userData = { uid: user.uid, email: user.email, displayName: user.displayName || null, photoURL: user.photoURL || null, referralCode: referralCode || null };
        response = await registerUser(idToken, userData);
        authType = 'register';
      } else {
        console.log('🔑 Using login API for existing user');
        try {
          response = await loginWithToken(idToken, referralCode);
          authType = 'login';
        } catch {
          console.log('⚠️ Login failed, trying register as fallback...');
          const userData = { uid: user.uid, email: user.email, displayName: user.displayName || null, photoURL: user.photoURL || null, referralCode: referralCode || null };
          response = await registerUser(idToken, userData);
          authType = 'register';
        }
      }
      localStorage.setItem('token', idToken);
      console.log(`✅ Social ${authType} successful, token stored`);
      return { success: true, data: response.data, type: authType };
    } catch (error) {
      console.error('❌ Social Auth API failed:', error);
      let errorMessage = 'Social authentication failed';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      else if (error.message) errorMessage = error.message;
      return { success: false, error: errorMessage };
    }
  }
};

export {
  // Auth functions
  loginWithToken,
  registerUser,
  authAPI,

  // User functions
  getUserProfile,
  updateUserProfile,
  getUserSettings,        // 👈 เพิ่มตรงนี้
  updateUserSettings,     // 👈 เพิ่มตรงนี้

  // Farm functions
  getChickens,
  buyMother,
  feedChicken,
  feedMultipleChickens,
  sellChickensToSystem,

  // Wallet functions
  getBalance,
  deposit,
  withdraw,
  getDepositAddress,
  getDepositTransactions,

  // Eggs functions
  getEggs,
  claimEgg,
  sellEggs,

  // Food functions
  getFood,
  buyFood,

  // Incubator functions
  getIncubators,
  buyIncubator,
  insertToIncubator,

  // Chicks functions
  getChicks,
  feedChick,
  sellChick,

  // Market functions
  listMarketOrders,
  sellToMarket,
  buyFromMarket,
  cancelChickenListing,

  // Referral functions
  getReferralTree,

  // Promotions functions
  getPromotionStatistics,
  getMotherTierPrice,

  // Farm Redux functions
  getFarmStatus,  
  collectAllEggs,
  buyFoodRedux
};
