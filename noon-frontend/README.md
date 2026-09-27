# NOON Center — Frontend (React + Vite)

The public website and admin dashboard for NOON Center, consuming the Django REST API.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Make sure the Django backend is running at
`http://localhost:8000` (see `../noon-backend/README.md`) — the frontend calls it
directly for all content.

## Environment variables

Edit `.env`:

```
VITE_API_URL=http://localhost:8000/api
```

Set the deployed HTTPS API URL before building for production (e.g.
`https://api.nooncenter.tn/api`). Production builds do not fall back to localhost
or permit plain HTTP API URLs. A same-origin `/api` reverse-proxy path is also supported.

## What's inside

- **Public site** (`/`, `/services`, `/about`, `/contact`) — bilingual FR/AR with full
  RTL layout flip, content pulled live from the API (no hardcoded prices/hours/testimonials).
- **Booking form** — on submit, creates a real `Booking` record via the API **and**
  opens WhatsApp with a pre-filled message, so the salon gets both a database record
  to manage in the dashboard and an instant WhatsApp ping.
- **Admin dashboard** (`/admin`, login at `/admin/login`) — protected by a rotating, 12-hour token stored for the current browser tab:
  - **Overview** — booking/service counts at a glance
  - **Bookings** — filter by status, change status, delete
  - **Services & catégories** — full CRUD, including creating new categories
  - **Témoignages** — CRUD testimonials shown on the homepage
  - **Horaires** — edit opening hours per day
  - **Paramètres** — edit tagline, about text, address, phone, WhatsApp, Facebook link

## Build for production

```bash
npm run build
```

Outputs static files to `dist/` — deploy this to Netlify, Vercel, or any static host.
Remember to set `VITE_API_URL` to your production API before building.

