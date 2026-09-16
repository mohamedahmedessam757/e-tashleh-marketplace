import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

export const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach Token to every request
client.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('access_token') || localStorage.getItem('access_token'))
        : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle Errors
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Optional: Redirect to login or clear token if session expired
            // localStorage.removeItem('access_token');
            // window.location.href = '/login'; 
            console.warn('Unauthorized - Check credentials or token expiry');
        }
        return Promise.reject(error);
    }
);
