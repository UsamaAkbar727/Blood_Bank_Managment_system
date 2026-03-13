import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, request } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then((res) => {
        if (!mounted) return;
        setUser(res?.user || null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (username, password) => {
    setError(null);
    const res = await api.login({ username, password });
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      setError,
      login,
      logout,
      setUser,
      refresh: async () => {
        const res = await request('/api/auth/me.php');
        setUser(res?.user || null);
        return res?.user || null;
      },
    }),
    [user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
