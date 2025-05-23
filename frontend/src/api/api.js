
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

export const getChickens = (token) => api.get('/farm/chickens', {
  headers: { Authorization: `Bearer ${token}` }
});

export const feedChicken = (token, chickenId) => api.post(`/farm/feed/${chickenId}`, {}, {
  headers: { Authorization: `Bearer ${token}` }
});

export const buyMotherChicken = (token) => api.post('/farm/buy-mother', {}, {
  headers: { Authorization: `Bearer ${token}` }
});

export const sellChicken = (token, chickenId) => api.post(`/farm/sell/${chickenId}`, {}, {
  headers: { Authorization: `Bearer ${token}` }
});

export const depositFinance = (token, amount, currency) => api.post('/finance/deposit', {
  amount, currency
}, {
  headers: { Authorization: `Bearer ${token}` }
});
