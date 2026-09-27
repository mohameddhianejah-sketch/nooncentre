import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { LangProvider } from './context/LangContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import Services from './pages/Services';
import Gallery from './pages/Gallery';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import RequireAuth from './pages/admin/RequireAuth';
import ClientRoute from './pages/dashboard/ClientRoute';
import UserDashboard from './pages/dashboard/UserDashboard';
import GlobalErrorBoundary from './components/errors/GlobalErrorBoundary';
import ErrorRoute from './components/errors/ErrorRoute';
import ErrorPage from './components/errors/ErrorPage';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LangProvider>
          <BrowserRouter>
            <GlobalErrorBoundary>
              <ScrollToTop />
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                </Route>

                <Route path="/admin/login" element={<Login />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <ClientRoute>
                      <UserDashboard />
                    </ClientRoute>
                  }
                />

                {/* Global error system */}
                <Route path="/error" element={<ErrorRoute />} />
                <Route path="*" element={<ErrorPage code="404" />} />
              </Routes>
            </GlobalErrorBoundary>
          </BrowserRouter>
        </LangProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
