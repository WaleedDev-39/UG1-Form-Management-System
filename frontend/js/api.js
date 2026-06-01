/* ─── api.js – Central API utility ─────────────────────────────────────────
   All requests go through fetchAPI().
   Token is read from localStorage on every call.
   Backend URL is configured in ../config.js
──────────────────────────────────────────────────────────────────────────── */

// Note: BASE_URL is defined in config.js - update that file for different environments

function getToken() {
  return localStorage.getItem('ug1_token') || '';
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('ug1_user') || 'null'); }
  catch { return null; }
}

function saveAuth(token, user) {
  localStorage.setItem('ug1_token', token);
  localStorage.setItem('ug1_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('ug1_token');
  localStorage.removeItem('ug1_user');
}

function isLoggedIn() {
  return !!getToken();
}

async function fetchAPI(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE_URL + path, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/index.html';
    return;
  }

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }

  // 204 No Content
  if (res.status === 204) return null;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();   // file downloads
}

async function fetchFormData(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE_URL + path, { method: 'POST', headers, body: formData });

  if (res.status === 401) { clearAuth(); window.location.href = '/index.html'; return; }

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container')
    || (() => { const d = document.createElement('div'); d.id='toast-container'; document.body.appendChild(d); return d; })();

  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ─── Auth guard ─────────────────────────────────────────────────────────── */
function requireAuth() {
  if (!isLoggedIn()) { window.location.href = '/index.html'; }
}

function requireRole(...roles) {
  const user = getUser();
  if (!user || !roles.includes(user.role)) {
    showToast('Access denied for your role.', 'error');
    setTimeout(() => window.location.href = '/dashboard.html', 1500);
  }
}

/* ─── Sidebar helpers ────────────────────────────────────────────────────── */
function renderUserPill() {
  const user = getUser();
  if (!user) return;
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name');
  const roleEl   = document.getElementById('user-role');
  if (avatarEl) avatarEl.textContent = (user.full_name || user.username).charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = user.full_name || user.username;
  if (roleEl)   roleEl.textContent   = user.role;
}

function setActiveNav(href) {
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.getAttribute('href') === href);
  });
}

function logout() {
  clearAuth();
  window.location.href = '/index.html';
}

/* ─── Badge helpers ──────────────────────────────────────────────────────── */
function feeStatusBadge(status) {
  const map = { Paid:'badge-paid', Installment:'badge-installment', Deferred:'badge-deferred' };
  return `<span class="badge ${map[status]||''}">${status}</span>`;
}

function roleBadge(role) {
  const map = { admin:'badge-admin', staff:'badge-staff', faculty:'badge-faculty' };
  return `<span class="badge ${map[role]||''}">${role}</span>`;
}

function boarderBadge(status) {
  const cls = status === 'Boarder' ? 'badge-boarder' : 'badge-nonboarder';
  return `<span class="badge ${cls}">${status}</span>`;
}

/* ─── Date format ─────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PK', { dateStyle:'medium', timeStyle:'short' });
}

function fmtDateOnly(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { dateStyle:'medium' });
}

/* ─── Hide admin-only nav if not admin ───────────────────────────────────── */
function applyRoleVisibility() {
  const user = getUser();
  if (!user) return;
  document.querySelectorAll('[data-role]').forEach(el => {
    const roles = el.dataset.role.split(',').map(r => r.trim());
    el.style.display = roles.includes(user.role) ? '' : 'none';
  });
}
