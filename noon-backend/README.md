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
  (`db.sqlite3`), which is retained as a backup of the pre-migration data
  (a full export is also saved as `db_export.json`).
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
python manage.py createsuperuser #anasalemlem123aS
python manage.py runserver
```

The API is now live at `http://localhost:8000/api/`.
The built-in Django admin (a full alternative admin UI) is at `http://localhost:8000/admin/`.

## Environment variables (all optional, sensible defaults for local dev)

| Variable | Default | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | insecure dev key | **Set a real random value in production** |
| `DJANGO_DEBUG` | `True` | Set to `False` in production |
| `DJANGO_ALLOWED_HOSTS` | `*` | Comma-separated list of allowed hosts in production |
| `DATABASE_URL` | unset (falls back to SQLite) | `postgres://user:pass@host:5432/dbname` to use PostgreSQL |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated frontend origins |
| `CORS_ALLOW_ALL` | `True` | Set to `False` in production and rely on `CORS_ALLOWED_ORIGINS` |

## API reference

Public (no auth required):
- `GET  /api/categories/` — service categories with nested services
- `GET  /api/services/` — flat service list
- `GET  /api/testimonials/` — active testimonials
- `GET  /api/hours/` — opening hours
- `GET  /api/settings/` — site settings (address, phone, about text, etc.)
- `POST /api/bookings/` — create a booking request (used by the contact form)

Admin only (require `Authorization: Token <token>` header, staff user):
- `POST /api/auth/login/` — `{username, password}` → `{token, username, is_staff}`
- `GET  /api/dashboard/summary/` — booking/service counts for the dashboard overview
- Full CRUD (`GET/POST/PUT/PATCH/DELETE`) on `/api/categories/`, `/api/services/`,
  `/api/testimonials/`, `/api/hours/{id}/`, `/api/bookings/`
- `PATCH /api/settings/` — update site settings

## Default admin login (created by the setup below)

If you use the exact commands in this README with `createsuperuser`, you'll set
your own username/password interactively. The demo data shipped for testing used
`admin` / `noonadmin2026` — **change this immediately if you keep it**.

## Production checklist
- Set `DJANGO_SECRET_KEY` to a long random value
- Set `DJANGO_DEBUG=False`
- Set `DJANGO_ALLOWED_HOSTS` to your real domain(s)
- Attach a PostgreSQL database and set `DATABASE_URL`
- Set `CORS_ALLOW_ALL=False` and `CORS_ALLOWED_ORIGINS` to your real frontend domain
- Run `python manage.py collectstatic`
- Serve with a real WSGI server (gunicorn/uwsgi) behind nginx, not `runserver`
