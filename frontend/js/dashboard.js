// dashboard.js
requireAuth();

async function init() {
  // Inject sidebar
  const res = await fetch('/sidebar.html');
  document.getElementById('sidebar-placeholder').innerHTML = await res.text();
  setActiveNav('/dashboard.html');
  renderUserPill();
  applyRoleVisibility();

  // Date
  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-PK', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Welcome name
  const user = getUser();
  document.getElementById('welcome-name').textContent = user?.full_name || user?.username || '—';

  loadStats();
  loadRecentForms();
}

async function loadStats() {
  try {
    const s = await fetchAPI('/api/reports/dashboard');
    document.getElementById('stat-students').textContent    = s.total_students;
    document.getElementById('stat-forms').textContent       = s.total_forms;
    document.getElementById('stat-paid').textContent        = s.paid_count;
    document.getElementById('stat-installment').textContent = s.installment_count;
    document.getElementById('stat-deferred').textContent    = s.deferred_count;
    document.getElementById('stat-today').textContent       = s.today_forms;
  } catch (e) { showToast('Failed to load stats: ' + e.message, 'error'); }
}

async function loadRecentForms() {
  try {
    const forms = await fetchAPI('/api/forms/?limit=10');
    document.getElementById('recent-loading').style.display = 'none';
    document.getElementById('recent-table-wrap').style.display = '';

    const tbody = document.getElementById('recent-tbody');
    if (!forms.length) {
      document.getElementById('recent-empty').style.display = '';
      return;
    }

    tbody.innerHTML = forms.map((f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${f.student.ag_number}</strong></td>
        <td>${f.student.name}</td>
        <td>${f.voucher_id}</td>
        <td>${feeStatusBadge(f.fee_status)}</td>
        <td>${fmtDate(f.submission_date)}</td>
        <td>${f.processed_by_user.full_name}</td>
      </tr>
    `).join('');
  } catch (e) {
    document.getElementById('recent-loading').style.display = 'none';
    showToast('Failed to load recent forms: ' + e.message, 'error');
  }
}

init();
