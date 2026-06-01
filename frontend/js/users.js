// users.js  –  Admin-only
requireAuth();
requireRole('admin');

let editingUserId = null;

async function init() {
  const res = await fetch('/sidebar.html');
  document.getElementById('sidebar-placeholder').innerHTML = await res.text();
  setActiveNav('/manage_users.html');
  renderUserPill();
  applyRoleVisibility();
  loadUsers();
}

async function loadUsers() {
  const loading = document.getElementById('users-loading');
  const content = document.getElementById('users-content');
  loading.style.display = ''; content.style.display = 'none';

  try {
    const users = await fetchAPI('/api/users/');
    loading.style.display = 'none'; content.style.display = '';
    const me = getUser();

    if (!users.length) { document.getElementById('users-empty').style.display = ''; return; }
    document.getElementById('users-empty').style.display = 'none';

    document.getElementById('users-tbody').innerHTML = users.map((u, i) => `
      <tr ${u.id === me?.id ? 'style="background:rgba(247,168,0,0.05);"' : ''}>
        <td>${i + 1}</td>
        <td><strong>${u.full_name}</strong> ${u.id === me?.id ? '<span style="font-size:0.72rem;color:var(--gold);font-weight:600;">(You)</span>' : ''}</td>
        <td style="font-family:monospace;">${u.username}</td>
        <td>${u.email}</td>
        <td>${roleBadge(u.role)}</td>
        <td><span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>${fmtDateOnly(u.created_at)}</td>
        <td style="text-align:center;">
          <button class="btn btn-sky btn-sm" onclick="openEditModal(${JSON.stringify(u).replace(/"/g,'&quot;')})">Edit</button>
          ${u.id !== me?.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${u.username}')">Delete</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    loading.style.display = 'none';
    showToast('Failed to load users: ' + e.message, 'error');
  }
}

function openAddModal() {
  editingUserId = null;
  document.getElementById('user-modal-title').textContent = 'Add User';
  document.getElementById('user-save-btn').textContent = 'Save User';
  document.getElementById('u-name').value = '';
  document.getElementById('u-username').value = '';
  document.getElementById('u-email').value = '';
  document.getElementById('u-role').value = 'staff';
  document.getElementById('u-password').value = '';
  document.getElementById('u-password-label').innerHTML = 'Password <span style="color:var(--danger)">*</span>';
  document.getElementById('u-username').disabled = false;
  document.getElementById('u-active-group').style.display = 'none';
  document.getElementById('user-alert').style.display = 'none';
  document.getElementById('user-modal').classList.add('open');
}

function openEditModal(u) {
  editingUserId = u.id;
  document.getElementById('user-modal-title').textContent = 'Edit User';
  document.getElementById('user-save-btn').textContent = 'Update User';
  document.getElementById('u-name').value     = u.full_name;
  document.getElementById('u-username').value = u.username;
  document.getElementById('u-username').disabled = true;
  document.getElementById('u-email').value    = u.email;
  document.getElementById('u-role').value     = u.role;
  document.getElementById('u-password').value = '';
  document.getElementById('u-password-label').innerHTML = 'New Password <small style="color:var(--text-muted)">(leave blank to keep)</small>';
  document.getElementById('u-active').checked = u.is_active;
  document.getElementById('u-active-group').style.display = '';
  document.getElementById('user-alert').style.display = 'none';
  document.getElementById('user-modal').classList.add('open');
}

async function saveUser() {
  const alertEl = document.getElementById('user-alert');
  alertEl.style.display = 'none';

  const name     = document.getElementById('u-name').value.trim();
  const username = document.getElementById('u-username').value.trim();
  const email    = document.getElementById('u-email').value.trim();
  const role     = document.getElementById('u-role').value;
  const password = document.getElementById('u-password').value;
  const isActive = document.getElementById('u-active').checked;

  if (!name || !email || (!editingUserId && (!username || !password))) {
    alertEl.className = 'alert alert-danger';
    alertEl.innerHTML = '❌ Please fill all required fields.';
    alertEl.style.display = 'flex'; return;
  }

  const btn = document.getElementById('user-save-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

  try {
    if (editingUserId) {
      const payload = { full_name:name, email, role, is_active:isActive };
      if (password) payload.password = password;
      await fetchAPI(`/api/users/${editingUserId}`, { method:'PUT', body:JSON.stringify(payload) });
      showToast('User updated!', 'success');
    } else {
      await fetchAPI('/api/users/', { method:'POST', body:JSON.stringify({ username, email, full_name:name, password, role }) });
      showToast('User created!', 'success');
    }
    closeModal('user-modal');
    loadUsers();
  } catch (e) {
    alertEl.className = 'alert alert-danger';
    alertEl.innerHTML = `❌ ${e.message}`;
    alertEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = editingUserId ? 'Update User' : 'Save User';
  }
}

async function deleteUser(id, username) {
  if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
  try {
    await fetchAPI(`/api/users/${id}`, { method:'DELETE' });
    showToast('User deleted.', 'success');
    loadUsers();
  } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

init();
