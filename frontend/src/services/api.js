import axios from 'axios';
const api = axios.create({ baseURL: process.env.REACT_APP_API_URL });

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

// Farm endpoints
export const getChickens = (token) =>
  api.get('/farm/chickens', { headers: bearer(token) });
export const buyMother = (data, token) =>
  api.post('/farm/buy-mother', data, { headers: bearer(token) });
export const feedChicken = (id, token) =>
  api.post(`/farm/feed/${id}`, null, { headers: bearer(token) });
export const sellChicken = (id, token) =>
  api.delete(`/farm/sell/${id}`, { headers: bearer(token) });

// Wallet endpoints
export const getBalance = (token) =>
  api.get('/wallet/balance', { headers: bearer(token) });
export const deposit = (data, token) =>
  api.post('/wallet/deposit', data, { headers: bearer(token) });
export const withdraw = (data, token) =>
  api.post('/wallet/withdraw', data, { headers: bearer(token) });

// Eggs endpoints
export const getEggs = (token) =>
  api.get('/eggs', { headers: bearer(token) });
export const sellEggs = (data, token) =>
  api.post('/eggs/sell', data, { headers: bearer(token) });

// Placeholder for food until API is implemented
export const getFood = (token) =>
  Promise.resolve({ data: { food: 0 } });
