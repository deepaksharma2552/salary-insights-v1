import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — restore non-sensitive user profile from localStorage.
  // The JWT itself is now in an httpOnly cookie managed by the browser;
  // we only persist the public user fields (email, name, role) for UI state.
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Called by OAuth2RedirectPage — token is already in the httpOnly cookie
  // by the time the redirect lands, so we only need the user profile.
  const loginWithToken = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    // Backend sets the JWT in an httpOnly cookie automatically.
    // response.data.data still contains the user profile fields we need for the UI.
    const { accessToken, tokenType, expiresIn, ...userData } = response.data.data;
    // Store only non-sensitive profile — NOT the token — in localStorage.
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const parts     = name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName  = parts.slice(1).join(' ') || parts[0];
    const response  = await api.post('/auth/register', { firstName, lastName, email, password });
    const { accessToken, tokenType, expiresIn, ...userData } = response.data.data;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Tell the backend to clear the httpOnly cookie server-side.
      await api.post('/auth/logout');
    } catch {
      // Even if the request fails (e.g. already expired), clear client state.
    } finally {
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
