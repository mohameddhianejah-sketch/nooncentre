import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LangContext';
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
  const [mode, setMode] = useState(initialMode === 'login' ? 'login' : 'signup');
  const [authData, setAuthData] = useState({ name: '', phone: '', birthday: '', code: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', phone: '', birthday: '' });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [dupAlert, setDupAlert] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [debugCode, setDebugCode] = useState('');

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  function handleAuthChange(e) {
    setAuthData((d) => ({ ...d, [e.target.name]: e.target.value }));
    setAuthError('');
    setFieldErrors((f) => ({ ...f, [e.target.name]: '' }));
  }

  function switchMode(next) {
    setMode(next);
    setAuthError('');
    setOtpSent(false);
    setOtpError('');
    setDebugCode('');
    setFieldErrors({ name: '', phone: '', birthday: '' });
  }

  function validateBase(needBirthday) {
    const errs = { name: '', phone: '', birthday: '' };
    const name = authData.name.trim();
    if (!name) errs.name = t('Veuillez entrer votre nom complet.', 'يرجى إدخال اسمك الكامل.');
    else if (name.length < 2 || name.length > 100) errs.name = t('Nom invalide.', 'اسم غير صالح.');
    const digits = authData.phone.replace(/\D/g, '');
    if (!digits) errs.phone = t('Veuillez entrer votre numéro de téléphone.', 'يرجى إدخال رقم هاتفك.');
    else if (digits.length < 8 || digits.length > 15) errs.phone = t('Numéro de téléphone invalide.', 'رقم هاتف غير صالح.');
    if (needBirthday && !authData.birthday) errs.birthday = t('Veuillez choisir votre date de naissance.', 'يرجى اختيار تاريخ ميلادك.');
    setFieldErrors(errs);
    return !errs.name && !errs.phone && !errs.birthday;
  }

  async function handleSendCode(e) {
    e.preventDefault();
    if (!validateBase(true)) return;
    setAuthBusy(true);
    setAuthError('');
    setOtpError('');
    try {
      const res = await api.sendCode({ phone: authData.phone });
      setOtpSent(true);
      setDebugCode(res.debug_code || '');
      setOtpCooldown(res.resend_after || 30);
      setAuthData((d) => ({ ...d, code: '' }));
    } catch (err) {
      if (err.status === 409) {
        setAuthError(t('Ce téléphone a déjà un compte. Connectez-vous.', 'هذا الهاتف له حساب بالفعل. سجّلي الدخول.'));
        setDupAlert(true);
      } else {
        setAuthError(t("Impossible d'envoyer le code. Vérifiez votre numéro.", 'تعذر إرسال الرمز. تحققي من رقمك.'));
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setVerifyBusy(true);
    setOtpError('');
    try {
      const account = await api.verifyCode({
        name: authData.name,
        phone: authData.phone,
        code: authData.code,
        birthday: authData.birthday || null,
      });
      const ok = typeof onAuthenticated === 'function';
      if (ok) onAuthenticated(account, t('Compte créé — vous pouvez réserver.', 'تم إنشاء حسابك — يمكنكِ الحجز.'));
    } catch (err) {
      const key = typeof err.message === 'string' ? err.message : '';
      if (key === 'wrong_code') {
        setOtpError(t('Code incorrect. Vérifiez le SMS et réessayez.', 'رمز غير صحيح. تحققي من الرسالة وأعيدي المحاولة.'));
      } else if (key === 'expired') {
        setOtpError(t('Le code a expiré. Renvoyez un nouveau code.', 'انتهت صلاحية الرمز. أرسلي رمزاً جديداً.'));
      } else if (key === 'too_many_attempts') {
        setOtpError(t('Trop de tentatives. Renvoyez un nouveau code.', 'محاولات كثيرة. أرسلي رمزاً جديداً.'));
      } else {
        setOtpError(t('Impossible de vérifier le code.', 'تعذر التحقق من الرمز.'));
      }
    } finally {
      setVerifyBusy(false);
    }
  }

  async function handleResendCode() {
    setAuthBusy(true);
    setOtpError('');
    setAuthError('');
    try {
      const res = await api.sendCode({ phone: authData.phone });
      setDebugCode(res.debug_code || '');
      setOtpCooldown(res.resend_after || 30);
      setAuthData((d) => ({ ...d, code: '' }));
    } catch (err) {
      if (err.status === 409) {
        setOtpError(t('Ce téléphone a déjà un compte.', 'هذا الهاتف له حساب بالفعل.'));
        setDupAlert(true);
      } else {
        setOtpError(t("Impossible d'envoyer le code.", 'تعذر إرسال الرمز.'));
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!validateBase(false)) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      const account = await api.checkClient({ name: authData.name, phone: authData.phone });
      if (typeof onAuthenticated === 'function') onAuthenticated(account);
    } catch {
      setAuthError(t('Aucun compte trouvé avec ces informations. Créez votre compte.', 'لا يوجد حساب بهذه المعلومات. أنشئي حسابك.'));
    } finally {
      setAuthBusy(false);
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
              ? t('Retrouvez votre compte avec votre nom et votre téléphone.', 'اكتشفي حسابكِ باسمكِ وهاتفكِ.')
              : t('Votre nom, téléphone et date de naissance créent votre compte. La réservation s’ouvre ensuite.', 'اسمكِ وهاتفكِ وتاريخ ميلادكِ يُنشئون حسابكِ. يُفتح الحجز بعد ذلك.')}
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

          {otpSent && (
            <p className="form-note" style={{ marginTop: 6 }}>
              {t('Un code de vérification a été envoyé au ', 'تم إرسال رمز التحقق إلى ')}
              <b>{authData.phone}</b>
            </p>
          )}

          {mode === 'signup' && !otpSent ? (
            <form onSubmit={handleSendCode} noValidate>
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
              <div className="form-row">
                <label htmlFor="ca-birthday">{t('Date de naissance', 'تاريخ الميلاد')}</label>
                <BirthdayPicker
                  id="ca-birthday"
                  value={authData.birthday}
                  onChange={(iso) => {
                    setAuthData((d) => ({ ...d, birthday: iso }));
                    setAuthError('');
                    setFieldErrors((f) => ({ ...f, birthday: '' }));
                  }}
                  hasError={!!fieldErrors.birthday}
                  errorId={fieldErrors.birthday ? 'ca-birthday-error' : undefined}
                />
                {fieldErrors.birthday && (
                  <p className="field-error" id="ca-birthday-error" role="alert">{fieldErrors.birthday}</p>
                )}
              </div>
              {authError && (
                <div className="form-error" role="alert" style={{ marginBottom: 12 }}>{authError}</div>
              )}
              <SpinningBorderButton type="submit" style={{ width: '100%' }} disabled={authBusy}>
                {authBusy
                  ? t('Patientez...', 'يرجى الانتظار...')
                  : t('Envoyer le code de vérification', 'إرسال رمز التحقق')}
              </SpinningBorderButton>
              <p className="form-note" style={{ textAlign: 'center', marginTop: 12 }}>
                <button type="button" className="btn-link-style" onClick={() => switchMode('login')}>
                  {t('Déjà un compte ? Connectez-vous', 'لديكِ حساب؟ سجّلي الدخول')}
                </button>
              </p>
            </form>
          ) : mode === 'signup' && otpSent ? (
            <div className="otp-step">
              {debugCode && (
                <p className="otp-debug">
                  {t('Code de test (mode démo) : ', 'رمز الاختبار (وضع تجريبي) : ')}
                  <b>{debugCode}</b>
                </p>
              )}
              <form onSubmit={handleVerifyCode}>
                <div className="form-row">
                  <label htmlFor="ca-otp">{t('Code de vérification', 'رمز التحقق')}</label>
                  <input
                    id="ca-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="code"
                    maxLength={6}
                    value={authData.code}
                    onChange={handleAuthChange}
                    placeholder="••••••"
                    autoFocus
                    required
                  />
                </div>
                {otpError && (
                  <div className="form-error" role="alert" style={{ marginBottom: 12 }}>{otpError}</div>
                )}
                <SpinningBorderButton type="submit" style={{ width: '100%' }} disabled={verifyBusy}>
                  {verifyBusy
                    ? t('Vérification...', 'جارٍ التحقق...')
                    : t('Vérifier le code', 'التحقق من الرمز')}
                </SpinningBorderButton>
                <div className="otp-actions">
                  <button type="button" className="btn-link-style" onClick={handleResendCode} disabled={otpCooldown > 0 || authBusy}>
                    {otpCooldown > 0
                      ? t(`Renvoyer dans ${otpCooldown}s`, `إعادة الإرسال بعد ${otpCooldown} ث`)
                      : t('Renvoyer le code', 'إعادة إرسال الرمز')}
                  </button>
                  <button
                    type="button"
                    className="btn-link-style"
                    onClick={() => { setOtpSent(false); setOtpError(''); setDebugCode(''); setAuthData((d) => ({ ...d, code: '' })); }}
                  >
                    {t('Modifier le numéro', 'تغيير الرقم')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleLogin} noValidate>
              <div className="form-two">
                <div className="form-row">
                  <label htmlFor="ca-name-login">{t('Nom complet', 'الاسم الكامل')}</label>
                  <input
                    id="ca-name-login"
                    type="text"
                    name="name"
                    value={authData.name}
                    onChange={handleAuthChange}
                    aria-invalid={fieldErrors.name ? true : undefined}
                    aria-describedby={fieldErrors.name ? 'ca-name-error-login' : undefined}
                    autoComplete="name"
                    required
                  />
                  {fieldErrors.name && (
                    <p className="field-error" id="ca-name-error-login" role="alert">{fieldErrors.name}</p>
                  )}
                </div>
                <div className="form-row">
                  <label htmlFor="ca-phone-login">{t('Téléphone', 'الهاتف')}</label>
                  <input
                    id="ca-phone-login"
                    type="tel"
                    name="phone"
                    value={authData.phone}
                    onChange={handleAuthChange}
                    aria-invalid={fieldErrors.phone ? true : undefined}
                    aria-describedby={fieldErrors.phone ? 'ca-phone-error-login' : undefined}
                    autoComplete="tel"
                    required
                  />
                  {fieldErrors.phone && (
                    <p className="field-error" id="ca-phone-error-login" role="alert">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>
              {authError && (
                <div className="form-error" role="alert" style={{ marginBottom: 12 }}>{authError}</div>
              )}
              <SpinningBorderButton type="submit" style={{ width: '100%' }} disabled={authBusy}>
                {authBusy
                  ? t('Patientez...', 'يرجى الانتظار...')
                  : t('Me connecter', 'تسجيل الدخول')}
              </SpinningBorderButton>
              <p className="form-note" style={{ textAlign: 'center', marginTop: 12 }}>
                <button type="button" className="btn-link-style" onClick={() => switchMode('signup')}>
                  {t('Pas encore de compte ? Créez-en un', 'ليس لديكِ حساب؟ أنشئيه')}
                </button>
              </p>
            </form>
          )}

          {dupAlert && (
            <div className="alert-overlay">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}