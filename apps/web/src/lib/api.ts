import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(':3000', ':3001');
  }
  return 'http://localhost:3001';
};

export const api = axios.create({ baseURL: getBaseUrl() });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('kanban_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
