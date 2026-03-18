import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — restore session from localStorage if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    // Backend wraps response in ApiResponse<T>, real data is at response.data.data
    const { accessToken, ...userData } = response.data.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (name, email, password) => {
    // Backend expects firstName + lastName separately
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName  = parts.slice(1).join(' ') || parts[0]; // fallback to same if single word
    const response = await api.post('/auth/register', { firstName, lastName, email, password });
    // Backend wraps response in ApiResponse<T>, real data is at response.data.data
    const { accessToken, ...userData } = response.data.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const loginWithToken = useCallback(({ token, email, firstName, lastName, role }) => {
    const userData = { email, firstName, lastName, role };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
