"""
Django settings for NOON Center backend.

Database: SQLite by default (zero-config, perfect for a single-location
business site). Set the DATABASE_URL env var to switch to PostgreSQL in
production (e.g. postgres://user:pass@host:5432/dbname) — no code change
needed, only the env var.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Load variables from the .env file next to manage.py (never overrides real env vars)
load_dotenv(BASE_DIR / '.env')

DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set when DEBUG is disabled.')
    SECRET_KEY = 'dev-only-insecure-key-do-not-use-in-production'

ALLOWED_HOSTS = [
    host.strip() for host in os.environ.get(
        'DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,[::1]' if DEBUG else ''
    ).split(',') if host.strip()
]
if not DEBUG and (not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS):
    raise ImproperlyConfigured('Set DJANGO_ALLOWED_HOSTS to explicit production hostnames.')

# Twilio providers. Leave blank to run in dev mode; booking notifications are
# saved but reported as unavailable when WhatsApp credentials are missing.
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_FROM_NUMBER = os.environ.get('TWILIO_FROM_NUMBER', '')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', '')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',

    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'noon_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'noon_backend.wsgi.application'

# ---------------------------------------------------------------------
# Database — SQLite by default, PostgreSQL via DATABASE_URL in production
# ---------------------------------------------------------------------
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    import re
    m = re.match(
        r'postgres(?:ql)?://(?P<user>[^:]+):(?P<password>[^@]*)@(?P<host>[^:/]+):?(?P<port>\d*)/(?P<name>.+)',
        DATABASE_URL,
    )
    if m:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': m.group('name'),
                'USER': m.group('user'),
                'PASSWORD': m.group('password'),
                'HOST': m.group('host'),
                'PORT': m.group('port') or '5432',
            }
        }
    else:
        raise ValueError('DATABASE_URL is set but not a valid postgres:// URL')
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr'
TIME_ZONE = 'Africa/Tunis'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------
# DRF + CORS
# ---------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.ExpiringTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Centralized error handling: safe JSON for HTTP errors, sanitized 500s
    # instead of Django/Python tracebacks being exposed to clients.
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/hour',
        'client_signup': '20/hour' if DEBUG else '5/hour',
        'client_login': '20/hour' if DEBUG else '10/hour',
        'admin_lookup': '20/hour' if DEBUG else '10/hour',
        'public_booking': '10/hour',
    },
}

CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173' if DEBUG else '',
    ).split(',') if origin.strip()
]
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL', 'False').lower() == 'true'
if not DEBUG and CORS_ALLOW_ALL_ORIGINS:
    raise ImproperlyConfigured('CORS_ALLOW_ALL must be False in production.')

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'
SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SECURE_SSL_REDIRECT', str(not DEBUG)).lower() == 'true'
SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_HSTS_SECONDS', '31536000' if not DEBUG else '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
