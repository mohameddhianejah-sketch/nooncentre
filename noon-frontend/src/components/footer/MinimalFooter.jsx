import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useTheme } from '../../context/ThemeContext';
import { MessageCircle, Phone } from 'lucide-react';
import { footerData } from './footerData';
import './MinimalFooter.css';
import whiteLogo from '../../assets/noon_logo.png';
import blackLogo from '../../assets/noon_logo_black.png';

const FacebookIcon = ({ size = 18, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.9 3.77-3.9 1.1 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.75 8.44-4.92 8.44-9.94Z" />
  </svg>
);

const SOCIAL_ICONS = {
  facebook: FacebookIcon,
  whatsapp: MessageCircle,
  phone: Phone,
};

export default function MinimalFooter({ settings }) {
  const { lang, t } = useLang();
  const { theme } = useTheme();

  const name = settings?.site_name || footerData.brand.name;
  const tagline = settings
    ? t(settings.tagline_fr, settings.tagline_ar)
    : t(footerData.brand.tagline.fr, footerData.brand.tagline.ar);

  const phone = settings?.phone || footerData.storeDefaults.phone;
  const whatsapp = settings?.whatsapp || footerData.storeDefaults.whatsapp;
  const facebookUrl = settings?.facebook_url || footerData.storeDefaults.facebookUrl;

  const hrefFor = (key) => {
    if (key === 'phone') return `tel:${phone}`;
    if (key === 'whatsapp') return `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
    if (key === 'facebook') return facebookUrl;
    return '#';
  };

  const founder = settings?.founder_name || '';
  const founderText = founder
    ? lang === 'ar'
      ? footerData.founderNames[founder] || founder
      : founder
    : '';
  const since = settings?.founded_year
    ? t(`Fondé en ${settings.founded_year}`, `تأسّس سنة ${settings.founded_year}`)
    : '';
  const by = founderText ? ` · ${t('par', 'على يد')} ${founderText}` : '';

  return (
    <footer className="min-footer">
      <div className="mf-inner">
        <div className="mf-grid">
          <div className="mf-brand-col">
            <Link
              to="/"
              className="mf-brand"
              aria-label={t('Retour à l’accueil', 'العودة إلى الرئيسية')}
            >
              <span className="mf-logo" aria-hidden="true">
                <img
                  className={`mf-logo-light ${theme === 'light' ? 'is-active' : ''}`}
                  src={blackLogo}
                  alt=""
                />
                <img
                  className={`mf-logo-dark ${theme === 'dark' ? 'is-active' : ''}`}
                  src={whiteLogo}
                  alt=""
                />
              </span>
              <span className="mf-name">{name}</span>
            </Link>

            <p className="mf-tagline">{tagline}</p>
            {(since || by) && (
              <p className="mf-since">
                {since}
                {by}
              </p>
            )}

            <ul className="mf-social">
              {footerData.social.map((s) => {
                const Icon = SOCIAL_ICONS[s.key];
                const label = t(s.label.fr, s.label.ar);
                return (
                  <li key={s.key}>
                    <a
                      href={hrefFor(s.key)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      title={label}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {footerData.navGroups.map((group) => (
            <nav
              key={group.key}
              className="mf-col"
              aria-label={t(group.heading.fr, group.heading.ar)}
            >
              <h3 className="mf-kicker">{t(group.heading.fr, group.heading.ar)}</h3>
              <ul>
                {group.links.map((link) => {
                  const label = t(link.label.fr, link.label.ar);
                  if (link.to) {
                    return (
                      <li key={link.to}>
                        <Link to={link.to} className="mf-link">
                          {label}
                        </Link>
                      </li>
                    );
                  }
                  const Icon = SOCIAL_ICONS[link.key];
                  const external = link.external === true;
                  return (
                    <li key={link.key}>
                      <a
                        className="mf-link"
                        href={hrefFor(link.key)}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noreferrer' : undefined}
                      >
                        {Icon && <Icon size={15} aria-hidden="true" />}
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mf-bottom">
          <p className="mf-copy">
            &copy; {new Date().getFullYear()} {name} — Boumhel El Bassatine, Ben Arous
          </p>
          <ul className="mf-legal">
            {footerData.legal.map((link) => (
              <li key={link.label.fr}>
                <a href={link.href}>{t(link.label.fr, link.label.ar)}</a>
              </li>
            ))}
          </ul>
          <p className="mf-note">{t(footerData.footerNote.fr, footerData.footerNote.ar)}</p>
        </div>
      </div>
    </footer>
  );
}