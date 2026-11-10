import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/axios.js';
import { resetSocket, getSocket } from '../api/socket.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    resetSocket();
    getSocket();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me').then((r) => setUser(r.data)).catch(() => logout()).finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const saveSession = ({ token, user: u }) => {
    localStorage.setItem('token', token);
    setUser(u);
    resetSocket();
    getSocket();
  };
  const login = async (email, password) => saveSession((await api.post('/auth/login', { email, password })).data);
  const register = async (form) => saveSession((await api.post('/auth/register', form)).data);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
