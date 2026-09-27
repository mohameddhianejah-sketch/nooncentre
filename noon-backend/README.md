# NOON Center — Backend (Django + DRF)

REST API powering the NOON Center website and admin dashboard.

## Stack
- **Django 5** + **Django REST Framework**
- **Database:** PostgreSQL 18 (local), database `nooncenter` owned by the dedicated
  `noon` user. Connection is configured in the gitignored `.env` file:

  ```
  DATABASE_URL=postgres://noon:PASSWORD@localhost:5432/nooncenter
  ```

  Settings auto-load `.env` via `python-dotenv`, but a real environment variable
  always wins. If `DATABASE_URL` is unset or empty the backend falls back to SQLite
  (`db.sqlite3`). Database exports contain personal data and must be stored outside
  the repository and never committed.
- **Auth:** DRF Token authentication for the admin dashboard.

## Why PostgreSQL?
The site runs on the local PostgreSQL 18 service. `python manage.py migrate` builds
the schema, then `seed_data` populates starter content (or `loaddata db_export.json`
restores the exact pre-migration data).

## Setup

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_data      # populates categories, services, hours, testimonials
python manage.py createsuperuser
python manage.py runserver
```

The API is now live at `http://localhost:8000/api/`.
The built-in Django admin (a full alternative admin UI) is at `http://localhost:8000/admin/`.

## Environment variables (all optional, sensible defaults for local dev)

| Variable | Default | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | development-only key when DEBUG is true | Required in production; use a unique random secret |
| `DJANGO_DEBUG` | `True` for local development | Set to `False` in production |
| `DJANGO_ALLOWED_HOSTS` | localhost only | Explicit comma-separated production hostnames; `*` is rejected |
| `DATABASE_URL` | unset (falls back to SQLite) | `postgres://user:pass@host:5432/dbname` to use PostgreSQL |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated frontend origins |
| `CORS_ALLOW_ALL` | `False` | Must remain `False` in production |
| `DJANGO_SECURE_SSL_REDIRECT` | follows DEBUG | Keep enabled in production behind a correctly configured HTTPS proxy |
| `DJANGO_HSTS_SECONDS` | 0 locally; 1 year in production | Keep enabled only when HTTPS is permanent |

## API reference

Public (no auth required):
- `GET  /api/categories/` — service categories with nested services
- `GET  /api/services/` — flat service list
- `GET  /api/testimonials/` — active testimonials
- `GET  /api/hours/` — opening hours
- `GET  /api/settings/` — site settings (address, phone, about text, etc.)
- `POST /api/bookings/` — create a booking request (used by the contact form)
- `POST /api/clients/check/` — checks whether the submitted name and phone match an admin; returns no private client data
- `POST /api/clients/` — create a client account with a password; returns a short-lived signed client session
- `POST /api/clients/login/` — client name, phone, and password login
- Existing client records need an initial password set from the trusted backend console with `python manage.py set_client_password`

Admin only (require `Authorization: Token <token>` header, staff user):
- `POST /api/auth/login/` — `{username, password}` → a rotating, 12-hour token; only active staff accounts can log in
- `POST /api/auth/logout/` — revoke the current admin token
- `GET  /api/dashboard/summary/` — booking/service counts for the dashboard overview
- Full CRUD (`GET/POST/PUT/PATCH/DELETE`) on `/api/categories/`, `/api/services/`,
  `/api/testimonials/`, `/api/hours/{id}/`, `/api/bookings/`
- `PATCH /api/settings/` — update site settings

## Production checklist
- Set `DJANGO_SECRET_KEY` to a long random value
- Set `DJANGO_DEBUG=False`
- Set `DJANGO_ALLOWED_HOSTS` to your real domain(s)
- Set `DJANGO_SECURE_SSL_REDIRECT=True` and serve the site only over HTTPS
- Attach a PostgreSQL database and set `DATABASE_URL`
- Keep `CORS_ALLOW_ALL=False`; set `CORS_ALLOWED_ORIGINS` to your frontend origin if frontend and API use different origins
- Admin lookup is not authentication by itself; every admin session still requires valid staff email and password credentials
- Keep database exports, SQLite files, and uploaded media outside public/static hosting and outside Git
- Run `python manage.py check --deploy` before deployment
- Run `python manage.py collectstatic`
- Serve with a real WSGI server (gunicorn/uwsgi) behind nginx, not `runserver`
