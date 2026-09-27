import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { SpinningBorderButton } from './SpinningBorderButton';
import BirthdayPicker from './BirthdayPicker';
import './ClientAuthCard.css';

const SLIDES = [
  { src: '/photos/center-noon-front.jpeg', fr: 'Bienvenue au NOON Center', ar: 'مرحباً بكم في مركز NOON' },
  { src: '/photos/spa.jpg', fr: 'Espace SPA & relaxation', ar: 'منتجع استرخاء وسبا' },
  { src: '/photos/visage.jpg', fr: 'Soins du visage', ar: 'العناية بالوجه' },
  { src: '/photos/corps.jpg', fr: 'Soins du corps', ar: 'العناية بالجسم' },
  { src: '/photos/mains.jpg', fr: 'Beauté des mains', ar: 'جمال اليدين' },
];

function AuthMediaSlider() {
  const { lang, t } = useLang();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="auth-media-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={SLIDES[index].src}
          className="auth-slide-img"
          src={SLIDES[index].src}
          alt={SLIDES[index][lang]}
          loading={index === 0 ? 'eager' : 'lazy'}
          draggable="false"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </AnimatePresence>

      <div className="auth-caption">
        <AnimatePresence>
          <motion.span
            key={`caption-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            {SLIDES[index][lang]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="auth-slide-dots" role="tablist" aria-label={t('Images', 'الصور')}>
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            className={`dot${i === index ? ' active' : ''}`}
            aria-label={s[lang]}
            aria-pressed={i === index}
            onClick={() => { setPaused(true); setIndex(i); }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ClientAuthCard({ id, initialMode = 'signup', onAuthenticated }) {
  const { t } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode === 'login' ? 'login' : 'signup');
  const [authData, setAuthData] = useState({ name: '', phone: '', birthday: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', phone: '' });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [dupAlert, setDupAlert] = useState(false);
  const [clientPasswordStep, setClientPasswordStep] = useState(false);
  const [clientPassword, setClientPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [adminStep, setAdminStep] = useState(null);
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  function handleAuthChange(e) {
    setAuthData((d) => ({ ...d, [e.target.name]: e.target.value }));
    setAuthError('');
    setFieldErrors((f) => ({ ...f, [e.target.name]: '' }));
  }

  function switchMode(next) {
    setMode(next);
    setAdminStep(null);
    setClientPasswordStep(false);
    setClientPassword('');
    setSignupPassword('');
    setAuthError('');
    setFieldErrors({ name: '', phone: '' });
  }

  function validateBase() {
    const errs = { name: '', phone: '' };
    const name = authData.name.trim();
    if (!name) errs.name = t('Veuillez entrer votre nom complet.', 'يرجى إدخال اسمك الكامل.');
    else if (name.length < 2 || name.length > 100) errs.name = t('Nom invalide.', 'اسم غير صالح.');
    const digits = authData.phone.replace(/\D/g, '');
    if (!digits) errs.phone = t('Veuillez entrer votre numéro de téléphone.', 'يرجى إدخال رقم هاتفك.');
    else if (digits.length < 8 || digits.length > 15) errs.phone = t('Numéro de téléphone invalide.', 'رقم هاتف غير صالح.');
    setFieldErrors(errs);
    return !errs.name && !errs.phone;
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!validateBase()) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      const account = await api.createClient({
        name: authData.name.trim(),
        phone: authData.phone.trim(),
        birthday: authData.birthday || null,
        password: signupPassword,
      });
      if (typeof onAuthenticated === 'function') {
        onAuthenticated(account, t('Compte créé — vous pouvez réserver.', 'تم إنشاء حسابك — يمكنكِ الحجز.'));
      }
    } catch (err) {
      if (err.data?.phone || err.status === 409) {
        setDupAlert(true);
        setAuthError(t('Ce numéro est déjà associé à un compte. Connectez-vous.', 'هذا الرقم مرتبط بحساب بالفعل. سجّل الدخول.'));
      } else {
        setAuthError(err.status === 429
          ? err.message
          : err.data?.password
            ? err.message
            : t('Impossible de créer le compte. Vérifiez vos informations.', 'تعذر إنشاء الحساب. تحقق من المعلومات.'));
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!validateBase()) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      const account = await api.checkClient({ name: authData.name.trim(), phone: authData.phone.trim() });
      if (account.is_admin) {
        setAdminStep(account);
        setAdminCreds({ email: '', password: '' });
        setAdminError('');
      } else if (account.client_exists && typeof onAuthenticated === 'function') {
        setClientPasswordStep(true);
        setClientPassword('');
      } else {
        setAuthError(t('Nom ou numéro non reconnu. Créez un compte ou réessayez.', 'الاسم أو الرقم غير معروف. أنشئ حساباً أو حاول مرة أخرى.'));
      }
    } catch {
      setAuthError(t('Impossible de vérifier ces informations. Réessayez.', 'تعذر التحقق من هذه المعلومات. حاول مرة أخرى.'));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleClientLogin(e) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const account = await api.loginClient({
        name: authData.name.trim(),
        phone: authData.phone.trim(),
        password: clientPassword,
      });
      if (typeof onAuthenticated === 'function') onAuthenticated(account);
    } catch (error) {
      setAuthError(error.status === 429
        ? error.message
        : t('Mot de passe incorrect ou compte à activer auprès du centre.', 'كلمة المرور غير صحيحة أو الحساب بحاجة إلى تفعيل من المركز.'));
    } finally {
      setAuthBusy(false);
    }
  }

  function handleAdminChange(e) {
    setAdminCreds((c) => ({ ...c, [e.target.name]: e.target.value }));
    setAdminError('');
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setAdminBusy(true);
    setAdminError('');
    try {
      const { success, message } = await login(adminCreds.email.trim(), adminCreds.password);
      if (success) {
        navigate('/admin');
      } else {
        setAdminError(/credential|password|mot de passe|login/i.test(message)
          ? t('Adresse e-mail ou mot de passe incorrect.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.')
          : message);
      }
    } finally {
      setAdminBusy(false);
    }
  }

  return (
    <div className="auth-card" id={id}>
      <div className="auth-media">
        <div className="auth-media-overlay" aria-hidden="true" />
        <AuthMediaSlider />
      </div>

      <div className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-eyebrow">
            {mode === 'login' ? t('Bienvenue', 'مرحباً') : t('Rejoignez NOON', 'انضمي إلى NOON')}
          </div>
          <h3>
            {mode === 'login'
              ? t('Connexion à votre compte', 'تسجيل الدخول إلى حسابك')
              : t('Créez votre compte client', 'أنشئي حسابك')}
          </h3>
          <p className="auth-sub">
            {mode === 'login'
              ? t('Saisissez le nom complet et le téléphone du compte. Les clients entrent leur mot de passe ; les administrateurs confirment avec leur e-mail et mot de passe.', 'أدخل الاسم الكامل ورقم الهاتف. يستخدم العملاء كلمة مرورهم، ويؤكد المسؤولون عبر البريد الإلكتروني وكلمة المرور.')
              : t('Créez un mot de passe pour retrouver votre profil et vos réservations.', 'أنشئ كلمة مرور للعودة إلى ملفك وحجوزاتك.')}
          </p>

          <div className="auth-tabs" role="tablist" aria-label={t('Connexion ou inscription', 'دخول أو إنشاء حساب')}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => switchMode('signup')}
            >
              {t('Inscription', 'إنشاء حساب')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              {t('Connexion', 'تسجيل الدخول')}
            </button>
          </div>

          <form onSubmit={mode === 'signup' ? handleSignup : clientPasswordStep ? handleClientLogin : handleLogin} noValidate>
            {clientPasswordStep ? (
              <>
                <p className="form-note">
                  {t(`Compte client : ${authData.name.trim()}`, `حساب العميل: ${authData.name.trim()}`)}
                </p>
                <div className="form-row">
                  <label htmlFor="ca-client-password">{t('Mot de passe', 'كلمة المرور')}</label>
                  <input
                    id="ca-client-password"
                    type="password"
                    autoComplete="current-password"
                    value={clientPassword}
                    onChange={(event) => setClientPassword(event.target.value)}
                    required
                  />
                </div>
                {authError && <div className="form-error" role="alert">{authError}</div>}
                <SpinningBorderButton type="submit" style={{ width: '100%' }} disabled={authBusy}>
                  {authBusy ? t('Connexion...', 'جارٍ الدخول...') : t('Ouvrir mon profil', 'فتح ملفي')}
                </SpinningBorderButton>
                <p className="form-note" style={{ textAlign: 'center', marginTop: 12 }}>
                  <button type="button" className="btn-link-style" onClick={() => { setClientPasswordStep(false); setClientPassword(''); setAuthError(''); }}>
                    {t('Retour', 'رجوع')}
                  </button>
                </p>
              </>
            ) : (
              <>
            <div className="form-two">
              <div className="form-row">
                <label htmlFor="ca-name">{t('Nom complet', 'الاسم الكامل')}</label>
                <input
                  id="ca-name"
                  type="text"
                  name="name"
                  value={authData.name}
                  onChange={handleAuthChange}
                  aria-invalid={fieldErrors.name ? true : undefined}
                  aria-describedby={fieldErrors.name ? 'ca-name-error' : undefined}
                  autoComplete="name"
                  required
                />
                {fieldErrors.name && (
                  <p className="field-error" id="ca-name-error" role="alert">{fieldErrors.name}</p>
                )}
              </div>
              <div className="form-row">
                <label htmlFor="ca-phone">{t('Téléphone', 'الهاتف')}</label>
                <input
                  id="ca-phone"
                  type="tel"
                  name="phone"
                  value={authData.phone}
                  onChange={handleAuthChange}
                  aria-invalid={fieldErrors.phone ? true : undefined}
                  aria-describedby={fieldErrors.phone ? 'ca-phone-error' : undefined}
                  autoComplete="tel"
                  required
                />
                {fieldErrors.phone && (
                  <p className="field-error" id="ca-phone-error" role="alert">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div className="form-row">
                  <label htmlFor="ca-birthday">{t('Date de naissance (optionnel)', 'تاريخ الميلاد (اختياري)')}</label>
                  <BirthdayPicker
                    id="ca-birthday"
                    value={authData.birthday}
                    onChange={(iso) => {
                      setAuthData((d) => ({ ...d, birthday: iso }));
                      setAuthError('');
                    }}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="ca-signup-password">{t('Mot de passe', 'كلمة المرور')}</label>
                  <input
                    id="ca-signup-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {authError && (
              <div className="form-error" role="alert" style={{ marginBottom: 12 }}>{authError}</div>
            )}

            <SpinningBorderButton type="submit" style={{ width: '100%' }} disabled={authBusy}>
              {authBusy
                ? t('Patientez...', 'يرجى الانتظار...')
                : mode === 'signup'
                  ? t('Créer mon compte', 'إنشاء حسابي')
                  : t('Continuer', 'متابعة')}
            </SpinningBorderButton>

            <p className="form-note" style={{ textAlign: 'center', marginTop: 12 }}>
              {mode === 'signup' ? (
                <button type="button" className="btn-link-style" onClick={() => switchMode('login')}>
                  {t('Déjà un compte ? Connectez-vous', 'لديكِ حساب؟ سجّلي الدخول')}
                </button>
              ) : (
                <button type="button" className="btn-link-style" onClick={() => switchMode('signup')}>
                  {t('Pas encore de compte ? Créez-en un', 'ليس لديكِ حساب؟ أنشئيه')}
                </button>
              )}
            </p>
              </>
            )}
          </form>

          {dupAlert && createPortal(<div className="alert-overlay">
              <div className="alert-box" role="alert">
                <h4>{t('Compte déjà existant', 'الحساب موجود مسبقاً')}</h4>
                <p>
                  {t("Un compte est déjà enregistré avec ce numéro de téléphone. Connectez-vous pour continuer et éviter la création d'un doublon.",
                     'يوجد حساب مسجل بالفعل بهذا الرقم الهاتفي. سجّلي الدخول للمتابعة وتجنب إنشاء حساب مكرر.')}
                </p>
                <div className="alert-actions">
                  <button type="button" className="btn btn-gold" onClick={() => { setDupAlert(false); switchMode('login'); }}>
                    {t('Aller à la connexion', 'الانتقال إلى تسجيل الدخول')}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setDupAlert(false)}>
                    {t('Annuler', 'إلغاء')}
                  </button>
                </div>
              </div>
            </div>, document.body)}

          {adminStep && createPortal(<div className="alert-overlay">
              <div className="alert-box admin-step-box" role="dialog" aria-modal="true">
                <button
                  type="button"
                  className="alert-close"
                  aria-label={t('Fermer', 'إغلاق')}
                  onClick={() => setAdminStep(null)}
                  disabled={adminBusy}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
                <h4>{t('Espace administration', 'لوحة الإدارة')}</h4>
                <p>
                  {t('Bienvenue', 'مرحباً')}
                  {', '}
                  <strong>{adminStep.name}</strong>{' '}
                  —{' '}
                  {adminStep.admin_role === 'superadmin'
                    ? t('super administrateur', 'مدير عام')
                    : t('administrateur', 'مديرة إدارة')}.
                  <br />
                  {t('Vérifiez votre identité pour gérer la plateforme.', 'تحقق من هويتك لإدارة المنصة.')}
                </p>
                <form onSubmit={handleAdminSubmit} noValidate>
                  <div className="form-row">
                    <label htmlFor="adm-email">{t('Email', 'البريد الإلكتروني')}</label>
                    <input
                      id="adm-email"
                      type="email"
                      name="email"
                      value={adminCreds.email}
                      onChange={handleAdminChange}
                      autoComplete="email"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="adm-password">{t('Mot de passe', 'كلمة المرور')}</label>
                    <input
                      id="adm-password"
                      type="password"
                      name="password"
                      value={adminCreds.password}
                      onChange={handleAdminChange}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  {adminError && (
                    <div className="form-error" role="alert">{adminError}</div>
                  )}
                  <div className="alert-actions">
                    <SpinningBorderButton type="submit" disabled={adminBusy}>
                      {adminBusy
                        ? t('Connexion...', 'جاري الدخول...')
                        : t('Gérer la plateforme', 'إدارة المنصة')}
                    </SpinningBorderButton>
                  </div>
                </form>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: 12, fontSize: '.85rem' }}
                  onClick={() => {
                    setAdminStep(null);
                    if (typeof onAuthenticated === 'function') onAuthenticated(adminStep);
                  }}
                  disabled={adminBusy}
                >
                  {t('Continuer comme simple client', 'المتابعة كعميلة عادية')}
                </button>
              </div>
            </div>, document.body)}
        </div>
      </div>
    </div>
  );
}
