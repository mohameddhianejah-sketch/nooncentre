// ---------------------------------------------------------------------------
// Centralized error-page configuration.
//
// ONE key per HTTP status code (or 'GENERIC' for anything unknown/unexpected).
// Every entry provides bilingual (FR / AR) title + description and the list of
// action buttons to render. The JSX in ErrorPage.jsx is shared — nothing is
// duplicated per status code.
//
// Action kinds supported:
//   'home'   → "Back to Home"  (router Link to '/')
//   'retry'  → "Try Again"     (page-provided onRetry callback)
//   'signin' → "Sign In"       (router Link to '/admin/login')
//
// To change a message, edit it here. To add a new error code, add one entry.
// ---------------------------------------------------------------------------

export const ERROR_MESSAGES = {
  400: {
    fr: {
      title: 'Requête invalide',
      description: 'La requête n\u2019a pas pu être traitée. Veuillez réessayer.',
    },
    ar: {
      title: 'طلب غير صالح',
      description: 'تعذّرت معالجة الطلب. يرجى المحاولة مرة أخرى.',
    },
    actions: ['home'],
  },

  401: {
    fr: {
      title: 'Authentification requise',
      description: 'Vous devez vous connecter pour accéder à cette page.',
    },
    ar: {
      title: 'تسجيل الدخول مطلوب',
      description: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.',
    },
    actions: ['signin', 'home'],
  },

  403: {
    fr: {
      title: 'Accès refusé',
      description: 'Vous n\u2019avez pas la permission d\u2019accéder à cette page.',
    },
    ar: {
      title: 'تم رفض الوصول',
      description: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
    },
    actions: ['home'],
  },

  404: {
    fr: {
      title: 'Page introuvable',
      description: 'La page que vous recherchez n\u2019existe pas ou a été déplacée.',
    },
    ar: {
      title: 'الصفحة غير موجودة',
      description: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
    },
    actions: ['home'],
  },

  408: {
    fr: {
      title: 'Délai dépassé',
      description: 'Votre requête a pris trop de temps à aboutir. Veuillez réessayer.',
    },
    ar: {
      title: 'انتهت المهلة',
      description: 'استغرق طلبك وقتًا طويلًا لإكماله. يرجى المحاولة مرة أخرى.',
    },
    actions: ['retry', 'home'],
  },

  429: {
    fr: {
      title: 'Trop de requêtes',
      description: 'Vous avez effectué trop de requêtes récemment. Veuillez patienter avant de réessayer.',
    },
    ar: {
      title: 'عدد كبير جدًا من الطلبات',
      description: 'لقد أرسلت عددًا كبيرًا من الطلبات مؤخرًا. يرجى الانتظار قبل إعادة المحاولة.',
    },
    actions: ['retry', 'home'],
  },

  500: {
    fr: {
      title: 'Quelque chose a mal tourné',
      description: 'Nous rencontrons un problème lors du traitement de votre requête. Veuillez réessayer.',
    },
    ar: {
      title: 'حدث خطأ ما',
      description: 'نواجه مشكلة في معالجة طلبك. يرجى المحاولة مرة أخرى.',
    },
    actions: ['retry', 'home'],
  },

  502: {
    fr: {
      title: 'Passerelle incorrecte',
      description: 'Le serveur a reçu une réponse invalide. Veuillez réessayer plus tard.',
    },
    ar: {
      title: 'بوابة غير صحيحة',
      description: 'تلقّى الخادم استجابة غير صالحة. يرجى المحاولة لاحقًا.',
    },
    actions: ['retry', 'home'],
  },

  503: {
    fr: {
      title: 'Service indisponible',
      description: 'Le service est temporairement indisponible. Veuillez réessayer plus tard.',
    },
    ar: {
      title: 'الخدمة غير متوفرة',
      description: 'الخدمة غير متاحة مؤقتًا. يرجى المحاولة لاحقًا.',
    },
    actions: ['retry', 'home'],
  },

  GENERIC: {
    fr: {
      title: 'Quelque chose a mal tourné',
      description: 'Une erreur inattendue s\u2019est produite. Veuillez réessayer.',
    },
    ar: {
      title: 'حدث خطأ ما',
      description: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
    },
    actions: ['retry', 'home'],
  },
};

export const ACTION_LABELS = {
  home: { fr: 'Retour à l\u2019accueil', ar: 'العودة للرئيسية' },
  retry: { fr: 'Réessayer', ar: 'إعادة المحاولة' },
  signin: { fr: 'Se connecter', ar: 'تسجيل الدخول' },
};

/**
 * Resolve the display configuration for a given error.
 *
 * Unknown / missing codes map to the generic page (code shown as "ERROR")
 * so no status is ever presented as a mystery page.
 *
 * @param {string|number} [code]    HTTP status code or any label.
 * @param {'fr'|'ar'}     [lang]    Current UI language.
 * @param {object}        [overrides] Optional title/description/actions/code overrides.
 * @returns {{code: string, title: string, description: string, actions: string[]}}
 */
export function buildError(code, lang = 'fr', overrides = {}) {
  const numeric = Number(code);
  const known = Number.isInteger(numeric) && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, String(numeric));
  const key = known ? String(numeric) : 'GENERIC';
  const entry = ERROR_MESSAGES[key];
  const texts = entry[lang] || entry.fr;

  return {
    code: overrides.code ?? (known ? String(numeric) : 'ERROR'),
    title: overrides.title ?? texts.title,
    description: overrides.description ?? texts.description,
    actions: Array.isArray(overrides.actions) ? overrides.actions : entry.actions,
  };
}

export function actionLabel(kind, lang = 'fr') {
  return (ACTION_LABELS[kind]?.[lang] ?? ACTION_LABELS[kind]?.fr) || kind;
}