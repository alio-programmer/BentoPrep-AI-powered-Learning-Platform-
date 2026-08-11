import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      return data.profile;
    } catch {
      setUser(null);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('pp_token');
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.session?.token) {
      localStorage.setItem('pp_token', data.session.token);
    }
    await fetchMe();
    return data;
  };

  const register = async (email, password, displayName) => {
    const { data } = await api.post('/auth/register', { email, password, displayName });
    if (data.session?.token) {
      localStorage.setItem('pp_token', data.session.token);
      await fetchMe();
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('pp_token');
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (patch) => {
    const { data } = await api.put('/auth/profile', patch);
    setProfile(data.profile);
    return data.profile;
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, login, register, logout, fetchMe, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
