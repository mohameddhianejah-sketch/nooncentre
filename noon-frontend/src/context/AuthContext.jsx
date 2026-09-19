import { createContext, useContext, useState } from 'react';
import { api, getToken, setToken } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const username = localStorage.getItem('noon_admin_username');
    const token = getToken();
    return token && username ? { username } : null;
  });
  const [error, setError] = useState(null);

  async function login(username, password) {
    setError(null);
    try {
      const data = await api.login(username, password);
      if (!data.is_staff) {
        throw new Error("Ce compte n'a pas les droits d'administration.");
      }
      setToken(data.token);
      localStorage.setItem('noon_admin_username', data.username);
      setUser({ username: data.username });
      return true;
    } catch (e) {
      setError(e.message || 'Échec de connexion');
      return false;
    }
  }

  function logout() {
    setToken(null);
    localStorage.removeItem('noon_admin_username');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
