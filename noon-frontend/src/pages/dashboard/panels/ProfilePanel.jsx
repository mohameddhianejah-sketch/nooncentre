import { useEffect, useRef, useState } from 'react';
import { useLang } from '../../../context/LangContext';
import { api, getClient, setClient, isPageError, errorPagePath } from '../../../api';
import { useNavigate } from 'react-router-dom';
import BirthdayPicker from '../../../components/BirthdayPicker';
import { SpinningBorderButton } from '../../../components/SpinningBorderButton';

export default function ProfilePanel() {
  const { t } = useLang();
  const navigate = useNavigate();
  const client = getClient() || {};
  const fileInput = useRef(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!client.id) { setLoading(false); return; }
    let alive = true;
    api
      .getProfile()
      .then((p) => {
        if (!alive) return;
        setName(p.name || '');
        setPhone(p.phone || '');
        setBirthday(p.birthday || '');
        setAvatarUrl(p.avatar_url || '');
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setLoading(false);
        if (isPageError(e.status)) navigate(errorPagePath(e.status, '/dashboard'), { replace: true });
        else setFormError(t('Impossible de charger votre profil.', 'تعذر تحميل ملفك الشخصي.'));
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFilePick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setFormError(t('Veuillez choisir une image.', 'الرجاء اختيار صورة.')); return; }
    if (f.size > 4 * 1024 * 1024) { setFormError(t("L'image ne doit pas dépasser 4 Mo.", 'يجب ألا يتجاوز حجم الصورة 4 ميجابايت.')); return; }
    setAvatarFile(f);
    setAvatarUrl(URL.createObjectURL(f));
    setFormError('');
  }

  function validate() {
    const errs = {};
    const n = name.trim();
    if (n.length < 2 || n.length > 100) errs.name = t('Le nom doit contenir entre 2 et 100 caractères.', 'يجب أن يتراوح الاسم بين حرفين و100 حرف.');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) errs.phone = t('Numéro de téléphone invalide (8 à 15 chiffres).', 'رقم هاتف غير صالح (8 إلى 15 رقماً).');
    if (!client?.id) errs.client = t('Session expirée, veuillez vous reconnecter.', 'انتهت الجلسة، يرجى إعادة تسجيل الدخول.');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setFormError('');
    setSuccess('');
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        birthday: birthday || null,
        avatar: avatarFile || undefined,
      });
      setClient({ ...client, name: updated.name, phone: updated.phone, birthday: updated.birthday, avatar_url: updated.avatar_url });
      setErrors({});
      setSuccess(t('Profil mis à jour avec succès.', 'تم تحديث ملفك الشخصي بنجاح.'));
    } catch (err) {
      setFormError(err.message);
      if (err.data?.phone) setErrors({ phone: Array.isArray(err.data.phone) ? err.data.phone[0] : err.data.phone });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-state">{t('Chargement…', 'جارٍ التحميل…')}</div>;

  return (
    <form className="form-card user-profile-card" onSubmit={handleSave} noValidate>
      <h3>{t('Profil', 'الملف الشخصي')}</h3>

      {success && <div className="form-success" role="status">{success}</div>}
      {formError && <div className="form-error" role="alert">{formError}</div>}

      <div className="profile-avatar-row">
        {avatarUrl
          ? <img className="profile-avatar" src={avatarUrl} alt={t('Photo de profil', 'صورة الملف الشخصي')} />
          : <div className="profile-avatar user-avatar-fallback">{name.slice(0, 1).toUpperCase() || 'N'}</div>}
        <div className="profile-avatar-actions">
          <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>
            {t('Changer la photo', 'تغيير الصورة')}
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFilePick} />
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="up-name">{t('Nom complet', 'الاسم الكامل')}</label>
        <input id="up-name" className={errors.name ? 'field-error-in' : ''} value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
      </div>

      <div className="form-row">
        <label htmlFor="up-phone">{t('Numéro de téléphone', 'رقم الهاتف')}</label>
        <input id="up-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        {errors.phone && <span className="field-error" role="alert">{errors.phone}</span>}
      </div>

      <div className="form-row">
        <label htmlFor="up-birthday">{t('Date de naissance', 'تاريخ الميلاد')}</label>
        <BirthdayPicker id="up-birthday" value={birthday} onChange={setBirthday} hasError={Boolean(errors.birthday)} errorId="up-birthday-error" />
        {errors.birthday && <span id="up-birthday-error" className="field-error" role="alert">{errors.birthday}</span>}
      </div>

      <div className="modal-actions">
        <SpinningBorderButton type="submit" disabled={saving}>
          {saving ? t('Enregistrement…', 'جارٍ الحفظ…') : t('Enregistrer les modifications', 'حفظ التغييرات')}
        </SpinningBorderButton>
      </div>
    </form>
  );
}