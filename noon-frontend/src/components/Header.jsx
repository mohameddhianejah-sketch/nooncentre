import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { getClient } from '../api';
import FlowButton from './FlowButton';
import logo from '../assets/noon_logo.png';
import blackLogo from '../assets/noon_logo_black.png';

export default function Header() {
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState(() => getClient());
  const { pathname } = useLocation();

  useEffect(() => {
    const sync = () => setClient(getClient());
    window.addEventListener('noon:client-updated', sync);
    return () => window.removeEventListener('noon:client-updated', sync);
  }, []);

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
            <div className="client-badge" title={client.phone}>{client.name}</div>
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