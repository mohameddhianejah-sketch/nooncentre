import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { getClient, setClient } from '../api';
import FlowButton from './FlowButton';
import logo from '../assets/noon_logo.png';
import blackLogo from '../assets/noon_logo_black.png';

export default function Header() {
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientEntering, setClientEntering] = useState(false);
  const [client, setClientState] = useState(() => getClient());
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => {
      const nextClient = getClient();
      setClientState((currentClient) => {
        if (!currentClient && nextClient) setClientEntering(true);
        return nextClient;
      });
    };
    window.addEventListener('noon:client-updated', sync);
    return () => window.removeEventListener('noon:client-updated', sync);
  }, []);

  useEffect(() => {
    if (!clientEntering) return undefined;
    const timer = window.setTimeout(() => setClientEntering(false), 720);
    return () => window.clearTimeout(timer);
  }, [clientEntering]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event) {
      if (!event.target.closest('.client-menu-wrap')) setMenuOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  function handleLogout() {
    setClient(null);
    setMenuOpen(false);
    navigate('/', { replace: true });
  }

  const links = [
    { to: '/', fr: 'Accueil', ar: 'الرئيسية' },
    { to: '/services', fr: 'Services', ar: 'الخدمات' },
    { to: '/gallery', fr: 'Galerie', ar: 'المعرض' },
    { to: '/about', fr: 'À propos', ar: 'من نحن' },
    { to: '/contact', fr: 'Contact', ar: 'اتصل بنا' },
  ];

  return (
    <header className="site-header">
      <div className="wrap">
        <Link to="/" className="brand" aria-label={t('Retour à l’accueil', 'العودة إلى الرئيسية')} title={t('Accueil', 'الرئيسية')} onClick={() => setOpen(false)}>
          <span className="brand-logo" aria-hidden="true">
            <img className={`brand-logo-light ${theme === 'light' ? 'is-active' : ''}`} src={blackLogo} alt="" />
            <img className={`brand-logo-dark ${theme === 'dark' ? 'is-active' : ''}`} src={logo} alt="" />
          </span>
          <span className="sr-only">NOON Center logo</span>
        </Link>

        <nav className={`main-nav ${open ? 'open' : ''}`}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={pathname === l.to ? 'active' : ''} onClick={() => setOpen(false)}>
              {t(l.fr, l.ar)}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {client ? (
            <div className="client-menu-wrap">
              <button
                type="button"
                className={`client-badge ${clientEntering ? 'client-entering' : ''}`}
                title={client.phone}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={(event) => {
                  event.preventDefault();
                  setMenuOpen((v) => !v);
                }}
              >
                <span className="client-avatar" aria-hidden="true">
                  {client.avatar_url
                    ? <img src={client.avatar_url} alt="" />
                    : (client.name?.slice(0, 1).toUpperCase() || 'N')}
                </span>
                <span className="client-name">{client.name}</span>
              </button>
              {menuOpen && (
                <div className="client-menu" role="menu" aria-label={t('Menu du compte', 'قائمة الحساب')}>
                  {client.session_token ? (
                    <Link to="/dashboard" className="client-menu-item" onClick={() => setMenuOpen(false)}>
                      {t('Mon profil', 'ملفي الشخصي')}
                    </Link>
                  ) : (
                    <Link to="/contact#booking" className="client-menu-item" onClick={() => setMenuOpen(false)}>
                      {t('Continuer la réservation', 'متابعة الحجز')}
                    </Link>
                  )}
                  <button type="button" className="client-menu-item danger" onClick={handleLogout}>
                    {t('Se déconnecter', 'تسجيل الخروج')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <FlowButton to="/contact?mode=login#booking" className="auth-login">
              {t('Connexion', 'تسجيل الدخول')}
            </FlowButton>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={t('Basculer le thème', 'تبديل المظهر')}
            title={t('Basculer le thème', 'تبديل المظهر')}
          >
            <span className="theme-icon" aria-hidden="true">
              <svg className={`theme-icon-sun ${theme === 'dark' ? 'is-active' : ''}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <svg className={`theme-icon-moon ${theme === 'light' ? 'is-active' : ''}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              </svg>
            </span>
          </button>
          <div className="lang-toggle">
            <button className={lang === 'fr' ? 'active' : ''} onClick={() => setLang('fr')}>FR</button>
            <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>عربي</button>
          </div>
          <button className="hamburger" aria-label="Menu" onClick={() => setOpen(!open)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}