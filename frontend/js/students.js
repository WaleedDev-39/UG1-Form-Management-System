// students.js
requireAuth();

let editingId   = null;
let searchTimer = null;

async function init() {
  const res = await fetch('/sidebar.html');
  document.getElementById('sidebar-placeholder').innerHTML = await res.text();
  setActiveNav('/students.html');
  renderUserPill();
  applyRoleVisibility();
  loadStudents();
}

async function loadStudents(search = '') {
  const loading = document.getElementById('students-loading');
  const content = document.getElementById('students-content');
  loading.style.display = ''; content.style.display = 'none';

  try {
    const url = `/api/students/?limit=200${search ? '&search=' + encodeURIComponent(search) : ''}`;
    const students = await fetchAPI(url);
    loading.style.display = 'none'; content.style.display = '';

    document.getElementById('student-count').textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('students-tbody');
    const user  = getUser();
    const canEdit = user?.role !== 'faculty';

    if (!students.length) {
      tbody.innerHTML = '';
      document.getElementById('students-empty').style.display = '';
      return;
    }
    document.getElementById('students-empty').style.display = 'none';

    tbody.innerHTML = students.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong style="color:var(--navy);font-family:'Poppins',sans-serif;">${s.ag_number}</strong></td>
        <td>${s.name}</td>
        <td>${s.father_name}</td>
        <td style="font-family:monospace;">${s.cnic}</td>
        <td>${boarderBadge(s.boarder_status)}</td>
        <td style="text-align:center;">${s.semester}</td>
        <td>${s.program || '—'}</td>
        <td style="text-align:center;">
          <button class="btn btn-outline btn-sm" onclick="viewBarcode(${s.id},'${s.ag_number}')">🔳 View</button>
        </td>
        <td style="text-align:center;">
          ${canEdit ? `
          <button class="btn btn-sky btn-sm" onclick="openEditModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id},'${s.name}')">Del</button>
          ` : '—'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    loading.style.display = 'none';
    showToast('Failed to load students: ' + e.message, 'error');
  }
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadStudents(document.getElementById('search-input').value.trim()), 400);
}

/* ── Modals ──────────────────────────────────────────────────────────────── */
function openAddModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add Student';
  document.getElementById('modal-save-btn').textContent = 'Save Student';
  clearForm();
  openModal('student-modal');
  // AG number editable only on add
  document.getElementById('f-ag').disabled = false;
}

function openEditModal(s) {
  editingId = s.id;
  document.getElementById('modal-title').textContent = 'Edit Student';
  document.getElementById('modal-save-btn').textContent = 'Update Student';
  document.getElementById('f-ag').value      = s.ag_number;
  document.getElementById('f-ag').disabled   = true; // AG number cannot change
  document.getElementById('f-cnic').value    = s.cnic;
  document.getElementById('f-name').value    = s.name;
  document.getElementById('f-father').value  = s.father_name;
  document.getElementById('f-boarder').value = s.boarder_status;
  document.getElementById('f-semester').value= s.semester;
  document.getElementById('f-dept').value    = s.department || '';
  document.getElementById('f-prog').value    = s.program    || '';
  document.getElementById('modal-alert').style.display = 'none';
  openModal('student-modal');
}

function clearForm() {
  ['f-ag','f-cnic','f-name','f-father','f-dept','f-prog'].forEach(id =>
    document.getElementById(id).value = ''
  );
  document.getElementById('f-boarder').value  = 'Boarder';
  document.getElementById('f-semester').value = '';
  document.getElementById('modal-alert').style.display = 'none';
}

async function saveStudent() {
  const alertEl = document.getElementById('modal-alert');
  alertEl.style.display = 'none';

  const payload = {
    cnic:           document.getElementById('f-cnic').value.trim(),
    name:           document.getElementById('f-name').value.trim(),
    father_name:    document.getElementById('f-father').value.trim(),
    boarder_status: document.getElementById('f-boarder').value,
    semester:       parseInt(document.getElementById('f-semester').value),
    department:     document.getElementById('f-dept').value.trim() || null,
    program:        document.getElementById('f-prog').value.trim() || null,
  };

  if (!payload.cnic || !payload.name || !payload.father_name || !payload.semester) {
    alertEl.className = 'alert alert-danger'; alertEl.innerHTML = '❌ Please fill all required fields.';
    alertEl.style.display = 'flex'; return;
  }

  const btn = document.getElementById('modal-save-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

  try {
    if (editingId) {
      await fetchAPI(`/api/students/${editingId}`, { method:'PUT', body:JSON.stringify(payload) });
      showToast('Student updated!', 'success');
    } else {
      payload.ag_number = document.getElementById('f-ag').value.trim();
      await fetchAPI('/api/students/', { method:'POST', body:JSON.stringify(payload) });
      showToast('Student added!', 'success');
    }
    closeModal('student-modal');
    loadStudents(document.getElementById('search-input').value.trim());
  } catch (e) {
    alertEl.className = 'alert alert-danger'; alertEl.innerHTML = `❌ ${e.message}`;
    alertEl.style.display = 'flex';
  } finally {
    btn.disabled = false; btn.innerHTML = editingId ? 'Update Student' : 'Save Student';
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
  try {
    await fetchAPI(`/api/students/${id}`, { method:'DELETE' });
    showToast('Student deleted.', 'success');
    loadStudents(document.getElementById('search-input').value.trim());
  } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
}

/* ── Barcode ─────────────────────────────────────────────────────────────── */
async function viewBarcode(id, ag) {
  try {
    const data = await fetchAPI(`/api/students/${id}/barcode`);
    document.getElementById('barcode-ag').textContent = ag;
    document.getElementById('barcode-img').src = data.barcode;
    openModal('barcode-modal');
  } catch (e) { showToast('Barcode error: ' + e.message, 'error'); }
}

function printBarcode() {
  const img = document.getElementById('barcode-img').src;
  const ag  = document.getElementById('barcode-ag').textContent;
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Barcode – ${ag}</title></head><body style="text-align:center;font-family:sans-serif;">
    <h3 style="color:#2D3178;">${ag}</h3><img src="${img}" style="max-width:400px;"/><br>
    <p style="font-size:12px;color:#666;">University of Agriculture Faisalabad – UG-1 Form</p>
    <script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
}

/* ── Import ──────────────────────────────────────────────────────────────── */
function openImportModal() {
  document.getElementById('import-file').value = '';
  document.getElementById('import-alert').style.display = 'none';
  openModal('import-modal');
}

async function importStudents() {
  const file = document.getElementById('import-file').files[0];
  const alertEl = document.getElementById('import-alert');
  if (!file) { alertEl.className='alert alert-danger'; alertEl.innerHTML='❌ Please select a file.'; alertEl.style.display='flex'; return; }

  const btn = document.getElementById('import-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Importing…';

  try {
    const fd = new FormData(); fd.append('file', file);
    const result = await fetchFormData('/api/students/import-excel', fd);
    alertEl.className = 'alert alert-success';
    alertEl.innerHTML = `✅ Import complete! Added: <strong>${result.added}</strong>, Skipped: <strong>${result.skipped}</strong>`;
    alertEl.style.display = 'flex';
    loadStudents();
  } catch (e) {
    alertEl.className = 'alert alert-danger'; alertEl.innerHTML = `❌ ${e.message}`;
    alertEl.style.display = 'flex';
  } finally {
    btn.disabled = false; btn.innerHTML = 'Import';
  }
}

/* ── Modal helpers ───────────────────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

init();
