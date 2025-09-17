import axios from 'axios';

const api = axios.create({ 
  baseURL: import.meta.env.REACT_APP_API_BASE || 'http://localhost:3001',
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('authToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;