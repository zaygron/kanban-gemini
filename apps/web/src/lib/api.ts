import axios from 'axios';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    // Tenta deduzir a porta localmente se rodando servidor de desenvolvimento dev sem .env
    return window.location.origin.includes('3000')
      ? window.location.origin.replace(':3000', ':3001')
      : 'http://localhost:3001';
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
