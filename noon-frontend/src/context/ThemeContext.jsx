import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

function preferredTheme() {
  const saved = localStorage.getItem('noon_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(preferredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('noon_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}