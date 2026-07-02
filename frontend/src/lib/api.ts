import axios from 'axios';
import { store } from '../app/store.ts';
import { clearCredentials, setCredentials } from '../features/auth/authSlice.ts';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Ensure cookies (refresh_token) are sent
});

// Request Interceptor: Attach bearer access token
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Token Refresh Rotation (RTR)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Intercept 401 Unauthorized errors and attempt session refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt silent refresh
        const refreshResponse = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const { access_token } = refreshResponse.data;
        
        const currentUser = store.getState().auth.user;
        if (currentUser) {
          // Commit rotated token to store
          store.dispatch(setCredentials({ user: currentUser, token: access_token }));
        }
        
        // Re-execute initial query with new credentials
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (cookie expired/revoked) - clear credentials & redirect to login
        store.dispatch(clearCredentials());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { AxiosError } from 'axios';
