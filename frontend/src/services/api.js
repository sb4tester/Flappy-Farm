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
const buyMother   = (data, token) => api.post('/farm/buy-mother', data, { headers: bearer(token) });
const feedChicken = (id, token) => api.post(`/farm/feed/${id}`, null, { headers: bearer(token) });
const sellChicken = (id, token) => api.delete(`/farm/sell/${id}`, { headers: bearer(token) });

// Wallet APIs
const getBalance = (token) => api.get('/wallet/balance', { headers: bearer(token) });
const deposit    = (data, token) => api.post('/wallet/deposit', data, { headers: bearer(token) });
const withdraw   = (data, token) => api.post('/wallet/withdraw', data, { headers: bearer(token) });

// Eggs APIs
const getEggs  = (token) => api.get('/eggs', { headers: bearer(token) });
const claimEgg = (token) => api.post('/eggs/claim', null, { headers: bearer(token) });
const sellEggs = (data, token) => api.post('/eggs/sell', data, { headers: bearer(token) });

// Food APIs (mock)
const getFood = (token) => Promise.resolve({ data: { food: 0 } });

// Incubator / Chicks APIs
const insertToIncubator = (data, token) => api.post('/incubator/insert', data, { headers: bearer(token) });
const getChicks         = (token) => api.get('/chicks', { headers: bearer(token) });
const feedChick         = (id, token) => api.post(`/chicks/feed/${id}`, null, { headers: bearer(token) });
const sellChick         = (id, token) => api.post(`/chicks/sell/${id}`, null, { headers: bearer(token) });

// Market APIs
const listMarketOrders = (token) => api.get('/market/orders', { headers: bearer(token) });
const sellToMarket     = (data, token) => api.post('/market/order', data, { headers: bearer(token) });
const buyFromMarket    = (orderId, token) => api.post(`/market/fill/${orderId}`, null, { headers: bearer(token) });

// Referral APIs
const getReferralTree = (token) => api.get('/referral/tree', { headers: bearer(token) });

// 🔧 Enhanced Auth Helper Functions
const authAPI = {
  // register user ใหม่
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

  // login user เก่า
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

  // social login/register
  socialAuth: async (user, referralCode = '', isNewUser = false) => {
    try {
      console.log(`🌐 Starting social auth... isNewUser: ${isNewUser}`);
      const idToken = await user.getIdToken(true); // ✅ await token
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

  // Farm functions
  getChickens,
  buyMother,
  feedChicken,
  sellChicken,

  // Wallet functions
  getBalance,
  deposit,
  withdraw,

  // Eggs functions
  getEggs,
  claimEgg,
  sellEggs,

  // Utility functions
  getFood,
  insertToIncubator,
  getChicks,
  feedChick,
  sellChick,
  listMarketOrders,
  sellToMarket,
  buyFromMarket,
  getReferralTree
};

export default {
  loginWithToken,
  registerUser,
  authAPI,
  getUserProfile,
  updateUserProfile,
  getChickens,
  buyMother,
  feedChicken,
  sellChicken,
  getBalance,
  deposit,
  withdraw,
  getEggs,
  claimEgg,
  sellEggs,
  getFood,
  insertToIncubator,
  getChicks,
  feedChick,
  sellChick,
  listMarketOrders,
  sellToMarket,
  buyFromMarket,
  getReferralTree
};
