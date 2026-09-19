// ============================================================
// MinimalFooter content — edit this file to change what the
// footer shows. The component (MinimalFooter.jsx) just renders
// this configuration, so you never need to touch its layout.
//
// NOTE:
//  - Internal links (`to`) use React Router and must match real
//    routes defined in src/App.jsx.
//  - Contact/social `href`s are injected at render time from the
//    live settings API (`GET /api/settings/`) when available, and
//    fall back to `storeDefaults` below otherwise.
//  - `legal` are placeholders: the site has no legal pages yet.
//    Point them at real routes/pages when those exist, or remove
//    them from the array to hide that line entirely.
// ============================================================

export const footerData = {
  // Brand column
  brand: {
    // `name` is overridden by `settings.site_name` when available.
    name: 'NOON Center',
    // Fallback tagline used while settings load (overridden by
    // `settings.tagline_fr` / `settings.tagline_ar` when available).
    tagline: {
      fr: 'Votre moment de beauté et de sérénité',
      ar: 'لحظتك الخاصة من الجمال والهدوء',
    },
  },

  // Fallback contact/social values when the settings API is empty.
  storeDefaults: {
    phone: '+21629909099',
    whatsapp: '21629909099',
    facebookUrl: 'https://www.facebook.com/nooncenter2016/',
  },

  // Main navigation groups rendered as columns.
  // `to`       = internal React Router route (real routes only).
  // `key`      = contact/social lookup, `href` is built at render.
  // `external` = open in a new tab (rel="noreferrer").
  navGroups: [
    {
      key: 'company',
      heading: { fr: 'Le centre', ar: 'المركز' },
      links: [
        { label: { fr: 'À propos', ar: 'من نحن' }, to: '/about' },
        { label: { fr: 'Services', ar: 'الخدمات' }, to: '/services' },
        { label: { fr: 'Galerie', ar: 'المعرض' }, to: '/gallery' },
        { label: { fr: 'Contact', ar: 'اتصل بنا' }, to: '/contact' },
      ],
    },
    {
      key: 'contact',
      heading: { fr: 'Contact', ar: 'تواصل معنا' },
      links: [
        { key: 'phone', label: { fr: 'Téléphone', ar: 'الهاتف' }, external: false },
        { key: 'whatsapp', label: { fr: 'WhatsApp', ar: 'واتساب' }, external: true },
        { key: 'facebook', label: { fr: 'Facebook', ar: 'فيسبوك' }, external: true },
      ],
    },
  ],

  // Social icon buttons (brand column).
  social: [
    { key: 'facebook', label: { fr: 'Facebook', ar: 'فيسبوك' } },
    { key: 'whatsapp', label: { fr: 'WhatsApp', ar: 'واتساب' } },
  ],

  // Bottom legal links — replace `href` with real pages when they exist.
  legal: [
    { label: { fr: 'Confidentialité', ar: 'الخصوصية' }, href: '#' },
    { label: { fr: 'Mentions légales', ar: 'البيانات القانونية' }, href: '#' },
  ],

  // Small note shown in the bottom bar next to the copyright.
  footerNote: {
    fr: 'Fait avec soin pour NOON Center',
    ar: 'صُنع بعناية لمركز NOON',
  },

  // Arabic spelling of the founder name (settings stores one string).
  founderNames: {
    'Saloua Nejah': 'سلوى نجاح',
  },
};