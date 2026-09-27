import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useTheme } from '../../context/ThemeContext';
import { setClient } from '../../api';
import { LayoutDashboard, User, CalendarDays, Settings, LogOut, House as HomeIcon } from 'lucide-react';
import whiteLogo from '../../assets/noon_logo.png';
import blackLogo from '../../assets/noon_logo_black.png';
import UserOverviewPanel from './panels/UserOverviewPanel';
import ProfilePanel from './panels/ProfilePanel';
import ReservationsPanel from './panels/ReservationsPanel';
import UserSettingsPanel from './panels/UserSettingsPanel';
import './dashboard.css';

const TABS = [
  { key: 'overview', icon: LayoutDashboard, fr: 'Aperçu', ar: 'نظرة عامة' },
  { key: 'profile', icon: User, fr: 'Mon profil', ar: 'ملفي الشخصي' },
  { key: 'reservations', icon: CalendarDays, fr: 'Mes réservations', ar: 'حجوزاتي' },
  { key: 'settings', icon: Settings, fr: 'Paramètres', ar: 'الإعدادات' },
];

export default function UserDashboard() {
  const { t } = useLang();
  const { theme } = useTheme();
  const [tab, setTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    setClient(null);
    navigate('/', { replace: true });
  }

  function pick(t) {
    setTab(t);
    setMenuOpen(false);
  }

  return (
    <div className="user-shell">
      <aside className={`user-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="user-sidebar-head">
          <Link to="/" className="brand" onClick={() => setMenuOpen(false)} title="NOON Center">
            <span className="brand-mini" aria-hidden="true">
              <img className={`brand-mini-light ${theme === 'light' ? 'is-active' : ''}`} src={blackLogo} alt="" />
              <img className={`brand-mini-dark ${theme === 'dark' ? 'is-active' : ''}`} src={whiteLogo} alt="" />
            </span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem' }}>Mon compte</span>
          </Link>
        </div>

        <nav className="user-nav">
          {TABS.map((t_) => {
            const Icon = t_.icon;
            return (
              <button key={t_.key} className={`user-nav-item ${tab === t_.key ? 'active' : ''}`} onClick={() => pick(t_.key)}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{t(t_.fr, t_.ar)}</span>
              </button>
            );
          })}
        </nav>

        <div className="user-sidebar-foot">
          <Link to="/" className="user-nav-item"><HomeIcon size={17} strokeWidth={1.8} /><span>{t('Retour au site', 'العودة إلى الموقع')}</span></Link>
          <button className="user-nav-item user-logout" onClick={handleLogout}>
            <LogOut size={17} strokeWidth={1.8} />
            <span>{t('Se déconnecter', 'تسجيل الخروج')}</span>
          </button>
        </div>
      </aside>

      <div className={`user-scrim ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />

      <main className="user-main">
        <div className="user-topbar">
          <button className={`hamburger ${menuOpen ? 'open' : ''}`} aria-label={t('Menu', 'القائمة')} onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
          <h1>{TABS.find((t_) => t_.key === tab) ? t(TABS.find((x) => x.key === tab).fr, TABS.find((x) => x.key === tab).ar) : ''}</h1>
        </div>

        {tab === 'overview' && <UserOverviewPanel onNavigate={pick} />}
        {tab === 'profile' && <ProfilePanel />}
        {tab === 'reservations' && <ReservationsPanel />}
        {tab === 'settings' && <UserSettingsPanel onLogout={handleLogout} />}
      </main>
    </div>
  );
}