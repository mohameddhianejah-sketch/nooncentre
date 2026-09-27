// Dev: go through the Vite dev server proxy (same-origin), so the browser
// never talks to the backend port directly (avoids CORS / network blocks).
// Production: must use the deployed HTTPS API (or a same-origin /api proxy).
const API_URL = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_URL;
if (!import.meta.env.DEV && !API_URL) {
  throw new Error('VITE_API_URL must be set for production builds.');
}
if (!import.meta.env.DEV && /^http:\/\//i.test(API_URL)) {
  throw new Error('Production API URLs must use HTTPS.');
}
const TOKEN_KEY = 'noon_admin_token';
const CLIENT_KEY = 'noon_client';

try {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('noon_admin_username');
  localStorage.removeItem(CLIENT_KEY);
} catch {
  // Storage may be unavailable in restricted browser contexts.
}

// Client account session (service client, identified by name + phone)
export function getClient() {
  try {
    const client = JSON.parse(sessionStorage.getItem(CLIENT_KEY));
    if (!client || typeof client !== 'object' || (!client.name && !client.phone)) {
      sessionStorage.removeItem(CLIENT_KEY);
      return null;
    }
    return client;
  } catch {
    sessionStorage.removeItem(CLIENT_KEY);
    return null;
  }
}
export function setClient(client) {
  if (client) sessionStorage.setItem(CLIENT_KEY, JSON.stringify(client));
  else sessionStorage.removeItem(CLIENT_KEY);
  window.dispatchEvent(new CustomEvent('noon:client-updated'));
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false, clientAuth = false } = {}) {
  const isFormData = body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Token ${token}`;
  }
  if (clientAuth && !headers['Authorization']) {
    const token = getClient()?.session_token;
    if (token) headers['Authorization'] = `Client ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401 && auth) {
      setToken(null);
      sessionStorage.removeItem('noon_admin_username');
      window.dispatchEvent(new CustomEvent('noon:admin-session-expired'));
    }
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
  getAdminTestimonials: () => request('/testimonials/', { auth: true }),
  getGallery: () => request('/gallery/'),
  getHours: () => request('/hours/'),
  getSettings: () => request('/settings/'),
  createBooking: (data) => request('/bookings/', { method: 'POST', body: data, clientAuth: true }),
  getAvailability: (date) => request(`/availability/?date=${date}`),

  // Auth
  login: (username, password) => request('/auth/login/', { method: 'POST', body: { username, password } }),
  getMe: () => request('/auth/me/', { auth: true }),
  logout: () => request('/auth/logout/', { method: 'POST', auth: true }),

  // Client self-service (verified client session)
  getProfile: () => request('/clients/me/', { clientAuth: true }),
  updateProfile: (data) => {
    const fd = new FormData();
    const { name, phone, birthday, avatar } = data;
    if (name) fd.append('name', name);
    if (phone) fd.append('phone', phone);
    if (birthday) fd.append('birthday', birthday);
    if (avatar) fd.append('avatar', avatar);
    return request('/clients/me/', { method: 'PATCH', body: fd, clientAuth: true });
  },
  getMyBookings: (status) =>
    request(`/bookings/my/${status ? `?status=${encodeURIComponent(status)}` : ''}`, { clientAuth: true }),
  cancelMyBooking: (bookingId) =>
    request('/bookings/my/cancel/', { method: 'POST', body: { booking_id: bookingId }, clientAuth: true }),

  // Admin (auth required)
  getDashboardSummary: () => request('/dashboard/summary/', { auth: true }),

  getBookings: () => request('/bookings/', { auth: true }),
  getAdminBookings: (params) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', params.page);
    if (params?.page_size) q.set('page_size', params.page_size);
    const qs = q.toString();
    return request(`/bookings/${qs ? `?${qs}` : ''}`, { auth: true });
  },
  updateBooking: (id, data) => request(`/bookings/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteBooking: (id) => request(`/bookings/${id}/`, { method: 'DELETE', auth: true }),

  getClients: () => request('/clients/', { auth: true }),
  getAdminClients: (params) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.page) q.set('page', params.page);
    if (params?.page_size) q.set('page_size', params.page_size);
    const qs = q.toString();
    return request(`/clients/${qs ? `?${qs}` : ''}`, { auth: true });
  },
  createClient: (data) => request('/clients/', { method: 'POST', body: data }),
  checkClient: (data) => request('/clients/check/', { method: 'POST', body: data }),
  loginClient: (data) => request('/clients/login/', { method: 'POST', body: data }),
  updateClient: (id, data) => request(`/clients/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteClient: (id) => request(`/clients/${id}/`, { method: 'DELETE', auth: true }),

  promoteClient: (id, data) => request(`/clients/${id}/promote/`, { method: 'POST', body: data, auth: true }),
  demoteClient: (id) => request(`/clients/${id}/demote/`, { method: 'POST', auth: true }),

  createService: (data) => request('/services/', { method: 'POST', body: data, auth: true }),
  updateService: (id, data) => request(`/services/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteService: (id) => request(`/services/${id}/`, { method: 'DELETE', auth: true }),

  createCategory: (data) => request('/categories/', { method: 'POST', body: data, auth: true }),
  updateCategory: (id, data) => request(`/categories/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteCategory: (id) => request(`/categories/${id}/`, { method: 'DELETE', auth: true }),

  createTestimonial: (data) => request('/testimonials/', { method: 'POST', body: data, auth: true, clientAuth: true }),
  updateTestimonial: (id, data) => request(`/testimonials/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteTestimonial: (id) => request(`/testimonials/${id}/`, { method: 'DELETE', auth: true }),

  createGallery: (data) => request('/gallery/', { method: 'POST', body: data, auth: true }),
  updateGallery: (id, data) => request(`/gallery/${id}/`, { method: 'PATCH', body: data, auth: true }),
  deleteGallery: (id) => request(`/gallery/${id}/`, { method: 'DELETE', auth: true }),

  updateHour: (id, data) => request(`/hours/${id}/`, { method: 'PATCH', body: data, auth: true }),

  updateSettings: (data) => request('/settings/', { method: 'PATCH', body: data, auth: true }),

  getAuditLogs: (params) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', params.limit);
    return request(`/admin/audit-logs/${q.toString() ? `?${q.toString()}` : ''}`, { auth: true });
  },
};
