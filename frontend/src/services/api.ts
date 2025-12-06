import axios, { AxiosError } from 'axios';

// Configuration de l'URL de l'API depuis les variables d'environnement
const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('API URL:', API_URL); // Debug: vérifier l'URL utilisée

// Instance Axios configurée
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token invalide ou expiré
      localStorage.removeItem('token');
      localStorage.removeItem('utilisateur');
      window.location.href = '/connexion';
    }
    return Promise.reject(error);
  }
);

export default api;
