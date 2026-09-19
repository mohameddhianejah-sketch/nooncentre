// Dev: go through the Vite dev server proxy (same-origin), so the browser
// never talks to the backend port directly (avoids CORS / network blocks).
// Production: must be provided via VITE_API_URL or default to the local API.
const API_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002/api');
const TOKEN_KEY = 'noon_admin_token';
const CLIENT_KEY = 'noon_client';

// Client account session (service client, identified by name + phone)
export function getClient() {
  try { return JSON.parse(localStorage.getItem(CLIENT_KEY)); } catch { return null; }
}
export function setClient(client) {
  if (client) localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
  else localStorage.removeItem(CLIENT_KEY);
  window.dispatchEvent(new CustomEvent('noon:client-updated'));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const isFormData = body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Token ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    let detail;
    try { detail = await res.json(); } catch { detail = { detail: res.statusText }; }
    const fieldError = Object.values(detail || {}).find((v) => Array.isArray(v) && v[0]);
    const message =
      (typeof detail?.detail === 'string' && detail.detail) ||
      detail?.non_field_errors?.[0] ||
      (typeof detail?.message === 'string' && detail.message) ||
      fieldError?.[0] ||
      res.statusText ||
      'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.data = detail;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// -------------------------------------------------------------------------
// Global error-page helpers.
//
// Only *page-level* failures should route to the global error page. Form
// validation (400s with field errors), wrong passwords, missing optional data,
// etc. keep their existing inline handling — callers decide per call.
// -------------------------------------------------------------------------

const PAGE_ERROR_STATUSES = [400, 401, 403, 404, 408, 429, 500, 502, 503];

/** True when a thrown request error carries one of the HTTP statuses the
 *  global error page can render. */
export function isPageError(status) {
  return PAGE_ERROR_STATUSES.includes(Number(status));
}

/** Build the SPA route for a page-level error:
 *  `/error?code=<status>&next=<next>` (next restores the "Try Again" target). */
export function errorPagePath(status, next) {
  const q = new URLSearchParams({ code: String(Number(status) || 0) });
  if (next) q.set('next', next);
  return `/error?${q.toString()}`;
}

export const api = {
  // Public
  getCategories: () => request('/categories/'),
  getServices: () => request('/services/'),
  getTestimonials: () => request('/testimonials/'),
  getGallery: () => request('/gallery/'),
  getHours: () => request('/hours/'),
  getSettings: () => request('/settings/'),
  createBooking: (data) => request('/bookings/', { method: 'POST', body: data }),
  getAvailability: (date) => request(`/availability/?date=${date}`),

  // Auth
  login: (username, password) => request('/auth/login/', { method: 'POST', body: { username, password } }),

  // Admin (auth required)
  getDashboardSummary: () => request('/dashboard/summary/', { auth: true }),

  getBookings: () => request('/bookings/', { auth: true }),
  updateBooking: (id, data) => request(`/bookings/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteBooking: (id) => request(`/bookings/${id}/`, { method: 'DELETE', auth: true }),

  getClients: () => request('/clients/', { auth: true }),
  createClient: (data) => request('/clients/', { method: 'POST', body: data }),
  checkClient: (data) => request('/clients/check/', { method: 'POST', body: data }),
  sendCode: (data) => request('/clients/send-code/', { method: 'POST', body: data }),
  verifyCode: (data) => request('/clients/verify/', { method: 'POST', body: data }),
  updateClient: (id, data) => request(`/clients/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteClient: (id) => request(`/clients/${id}/`, { method: 'DELETE', auth: true }),

  createService: (data) => request('/services/', { method: 'POST', body: data, auth: true }),
  updateService: (id, data) => request(`/services/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteService: (id) => request(`/services/${id}/`, { method: 'DELETE', auth: true }),

  createCategory: (data) => request('/categories/', { method: 'POST', body: data, auth: true }),
  updateCategory: (id, data) => request(`/categories/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteCategory: (id) => request(`/categories/${id}/`, { method: 'DELETE', auth: true }),

  createTestimonial: (data) => request('/testimonials/', { method: 'POST', body: data, auth: true }),
  updateTestimonial: (id, data) => request(`/testimonials/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteTestimonial: (id) => request(`/testimonials/${id}/`, { method: 'DELETE', auth: true }),

  createGallery: (data) => request('/gallery/', { method: 'POST', body: data, auth: true }),
  updateGallery: (id, data) => request(`/gallery/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteGallery: (id) => request(`/gallery/${id}/`, { method: 'DELETE', auth: true }),

  updateHour: (id, data) => request(`/hours/${id}/`, { method: 'PATCH', body: data, auth: true }),

  updateSettings: (data) => request('/settings/', { method: 'PATCH', body: data, auth: true }),
};
