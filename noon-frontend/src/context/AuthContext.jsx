import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const username = sessionStorage.getItem('noon_admin_username');
    const token = getToken();
    return token && username ? { username } : null;
  });
  const [error, setError] = useState(null);

  async function login(username, password) {
    try {
      const data = await api.login(username, password);
      if (!data.is_staff) {
        const msg = "Ce compte n'a pas les droits d'administration.";
        setError(msg);
        return { success: false, message: msg };
      }
      setToken(data.token);
      sessionStorage.setItem('noon_admin_username', data.username);
      setUser({ username: data.username });
      setError(null);
      return { success: true, message: '' };
    } catch (e) {
      const msg = e.message || 'Échec de connexion';
      setError(msg);
      return { success: false, message: msg };
    }
  }

  function logout() {
    if (getToken()) api.logout().catch(() => {});
    setToken(null);
    sessionStorage.removeItem('noon_admin_username');
    setUser(null);
  }

  useEffect(() => {
    function handleSessionExpired() {
      sessionStorage.removeItem('noon_admin_username');
      setUser(null);
    }
    window.addEventListener('noon:admin-session-expired', handleSessionExpired);
    return () => window.removeEventListener('noon:admin-session-expired', handleSessionExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
