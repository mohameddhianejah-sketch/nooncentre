import { useState } from 'react';
import { useLang } from '../../../context/LangContext';
import { useTheme } from '../../../context/ThemeContext';
import { Languages, Moon, Sun, Bell } from 'lucide-react';

export default function UserSettingsPanel({ onLogout }) {
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();
  const [notif, setNotif] = useState(() => localStorage.getItem('noon_notif') !== 'off');

  function saveNotif(v) {
    setNotif(v);
    try { localStorage.setItem('noon_notif', v ? 'on' : 'off'); } catch (_e) {}
  }

  return (
    <div className="settings-list">
      <div className="settings-item">
        <div>
          <div className="settings-item-label">
            <Languages size={16} strokeWidth={1.7} style={{ verticalAlign: '-3px', marginRight: 8 }} />
            {t('Langue', 'اللغة')}
          </div>
          <div className="settings-item-desc">
            {t('Choisissez la langue utilisée dans votre espace.', 'اختر اللغة المستخدمة في مساحتك.')}
          </div>
        </div>
        <div className="lang-chips">
          <button type="button" className={`lang-chip ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>
            Français
          </button>
          <button type="button" className={`lang-chip ${lang === 'ar' ? 'active' : ''}`} onClick={() => setLang('ar')}>
            العربية
          </button>
        </div>
      </div>

      <div className="settings-item">
        <div>
          <div className="settings-item-label">
            {theme === 'dark' ? <Moon size={16} strokeWidth={1.7} style={{ verticalAlign: '-3px', marginRight: 8 }} />
              : <Sun size={16} strokeWidth={1.7} style={{ verticalAlign: '-3px', marginRight: 8 }} />}
            {t('Apparence', 'المظهر')}
          </div>
          <div className="settings-item-desc">
            {t('Basculer entre le thème clair et le thème sombre.', 'التبديل بين المظهر الفاتح والمظهر الداكن.')}
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={theme === 'dark'} onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-item">
        <div>
          <div className="settings-item-label">
            <Bell size={16} strokeWidth={1.7} style={{ verticalAlign: '-3px', marginRight: 8 }} />
            {t('Notifications', 'الإشعارات')}
          </div>
          <div className="settings-item-desc">
            {t('Recevoir un rappel avant un rendez-vous.', 'تلقي تذكير قبل الموعد.')}
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={notif} onChange={(e) => saveNotif(e.target.checked)} />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-item">
        <button type="button" className="btn btn-danger" onClick={onLogout}>
          {t('Se déconnecter', 'تسجيل الخروج')}
        </button>
      </div>
    </div>
  );
}
