// reports.js
requireAuth();

async function init() {
  const res = await fetch('/sidebar.html');
  document.getElementById('sidebar-placeholder').innerHTML = await res.text();
  setActiveNav('/reports.html');
  renderUserPill();
  applyRoleVisibility();
  loadForms();
}

async function loadForms() {
  const loading = document.getElementById('forms-loading');
  const content = document.getElementById('forms-content');
  loading.style.display = ''; content.style.display = 'none';

  const status = document.getElementById('filter-status').value;
  const from   = document.getElementById('filter-from').value;
  const to     = document.getElementById('filter-to').value;

  let url = '/api/forms/?limit=500';
  if (status) url += '&fee_status=' + encodeURIComponent(status);

  try {
    const forms = await fetchAPI(url);
    loading.style.display = 'none'; content.style.display = '';

    // Client-side date filter
    const filtered = forms.filter(f => {
      if (!from && !to) return true;
      const d = new Date(f.submission_date);
      if (from && d < new Date(from)) return false;
      if (to   && d > new Date(to + 'T23:59:59')) return false;
      return true;
    });

    document.getElementById('form-count').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

    const tbody  = document.getElementById('forms-tbody');
    const user   = getUser();
    const canDel = user?.role !== 'faculty';

    if (!filtered.length) {
      tbody.innerHTML = '';
      document.getElementById('forms-empty').style.display = '';
      return;
    }
    document.getElementById('forms-empty').style.display = 'none';

    tbody.innerHTML = filtered.map((f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong style="color:var(--navy);font-family:'Poppins',sans-serif;">${f.student.ag_number}</strong></td>
        <td>${f.student.name}</td>
        <td>${f.student.father_name}</td>
        <td style="font-family:monospace;font-size:0.8rem;">${f.student.cnic}</td>
        <td>${boarderBadge(f.student.boarder_status)}</td>
        <td style="text-align:center;">${f.student.semester}</td>
        <td style="font-family:'Poppins',sans-serif;font-weight:600;">${f.voucher_id}</td>
        <td>${feeStatusBadge(f.fee_status)}</td>
        <td style="font-size:0.8rem;">${fmtDate(f.submission_date)}</td>
        <td>${f.processed_by_user.full_name}</td>
        <td>
          ${canDel ? `<button class="btn btn-danger btn-sm" onclick="deleteForm(${f.id})">Del</button>` : '—'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    loading.style.display = 'none';
    showToast('Failed to load forms: ' + e.message, 'error');
  }
}

function clearFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-from').value   = '';
  document.getElementById('filter-to').value     = '';
  loadForms();
}

async function deleteForm(id) {
  if (!confirm('Delete this form record? This cannot be undone.')) return;
  try {
    await fetchAPI(`/api/forms/${id}`, { method:'DELETE' });
    showToast('Form deleted.', 'success');
    loadForms();
  } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
}

async function exportExcel() {
  const status = document.getElementById('filter-status').value;
  const from   = document.getElementById('filter-from').value;
  const to     = document.getElementById('filter-to').value;

  let url = '/api/reports/export?';
  if (status) url += 'fee_status=' + encodeURIComponent(status) + '&';
  if (from)   url += 'date_from='  + from + '&';
  if (to)     url += 'date_to='    + to   + '&';

  try {
    showToast('Generating Excel report…', 'info');
    const token = getToken();
    const res   = await fetch('http://127.0.0.1:8000' + url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `UG1_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
    link.click();
    showToast('Excel file downloaded!', 'success');
  } catch (e) { showToast('Export failed: ' + e.message, 'error'); }
}

init();
