import axios from 'axios';

export const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api` });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Trả về body { success, data, message }; lỗi thì ném Error với message tiếng Việt từ server
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(new Error(err.response?.data?.message || 'Không kết nối được máy chủ.'));
  },
);
