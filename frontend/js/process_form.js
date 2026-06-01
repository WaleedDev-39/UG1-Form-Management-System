// process_form.js
requireAuth();
requireRole('admin', 'staff');

let currentStudent = null;
let selectedFee    = null;

/* ─── Init ──────────────────────────────────────────────────────────────── */
async function init() {
  const res = await fetch('/sidebar.html');
  document.getElementById('sidebar-placeholder').innerHTML = await res.text();
  setActiveNav('/process_form.html');
  renderUserPill();
  applyRoleVisibility();
  setupBarcodeInput();
}

/* ─── Mode toggle ─────────────────────────────────────────────────────────── */
function setMode(mode) {
  document.getElementById('mode-scanner').style.display = mode === 'scanner' ? '' : 'none';
  document.getElementById('mode-manual').style.display  = mode === 'manual'  ? '' : 'none';
  document.getElementById('toggle-scanner').className = mode === 'scanner' ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('toggle-manual').className  = mode === 'manual'  ? 'btn btn-primary' : 'btn btn-outline';
  if (mode === 'scanner') {
    setTimeout(() => document.getElementById('barcode-input').focus(), 50);
  }
}

/* ─── Barcode scanner input handler ──────────────────────────────────────── */
function setupBarcodeInput() {
  const input = document.getElementById('barcode-input');
  let buffer = '', timer = null;

  input.addEventListener('input', () => {
    const status = document.getElementById('scan-status');
    status.textContent = 'Scanning…';
    status.className   = 'scan-status';
    buffer = input.value;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (buffer.trim()) {
        lookupStudent(buffer.trim());
        input.value = '';
      }
    }, 300);
  });

  // Also handle Enter (USB scanners send Enter after barcode)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (val) { lookupStudent(val); input.value = ''; }
    }
  });

  // Auto-focus scanner input when scanner mode is active
  input.focus();
}

/* ─── Student lookup ──────────────────────────────────────────────────────── */
async function lookupStudent(inputStr) {
  const alertEl = document.getElementById('step1-alert');
  alertEl.style.display = 'none';

  if (!inputStr) {
    showAlert(alertEl, 'Please enter a valid AG number.', 'danger');
    return;
  }

  // Handle descriptive QR codes (e.g. "UG1_STUDENT_DATA\nAG: 2020-ag-1234\nName: ...")
  let agNumber = inputStr;
  if (inputStr.includes('UG1_STUDENT_DATA') && inputStr.includes('AG: ')) {
    try {
      const parts = inputStr.split('AG: ');
      agNumber = parts[1].split('\n')[0].trim();
    } catch (e) {
      console.error('Failed to parse QR data:', e);
    }
  }

  const status = document.getElementById('scan-status');
  if (status) { status.textContent = 'Looking up…'; status.className = 'scan-status'; }

  try {
    const student = await fetchAPI(`/api/students/${encodeURIComponent(agNumber)}/lookup`);
    currentStudent = student;
    if (status) { status.textContent = 'Found ✓'; status.className = 'scan-status ready'; }
    showStudentDetails(student);
    goToStep2();
  } catch (err) {
    showAlert(alertEl, `❌ ${err.message}`, 'danger');
    if (status) { status.textContent = 'Not found'; status.className = 'scan-status'; }
  }
}

function showStudentDetails(s) {
  document.getElementById('student-details-grid').innerHTML = `
    <div class="info-field"><label>AG Number</label><span>${s.ag_number}</span></div>
    <div class="info-field"><label>Student Name</label><span>${s.name}</span></div>
    <div class="info-field"><label>Father's Name</label><span>${s.father_name}</span></div>
    <div class="info-field"><label>CNIC</label><span>${s.cnic}</span></div>
    <div class="info-field"><label>Boarder Status</label><span>${boarderBadge(s.boarder_status)}</span></div>
    <div class="info-field"><label>Semester</label><span>Semester ${s.semester}</span></div>
    ${s.program    ? `<div class="info-field"><label>Program</label><span>${s.program}</span></div>`    : ''}
    ${s.department ? `<div class="info-field"><label>Department</label><span>${s.department}</span></div>` : ''}
  `;
}

/* ─── Step navigation ────────────────────────────────────────────────────── */
function setStep(n) {
  [1,2,3,4].forEach(i => {
    document.getElementById(`panel-${i}`).style.display = i === n ? '' : 'none';
    const step = document.getElementById(`step-${i}`);
    step.classList.remove('active','done');
    if (i < n) step.classList.add('done');
    if (i === n) step.classList.add('active');
  });
}

function resetToStep1() { currentStudent = null; selectedFee = null; setStep(1); }
function goToStep2()    { setStep(2); }
function goToStep3()    { setStep(3); }

/* ─── Fee selection ──────────────────────────────────────────────────────── */
function selectFee(status) {
  selectedFee = status;
  ['Paid','Installment','Deferred'].forEach(s => {
    const el = document.getElementById(`fee-${s.toLowerCase()}`);
    el.className = 'fee-btn';
    if (s === status) el.classList.add(`selected-${s.toLowerCase()}`);
  });
}

/* ─── Submit ─────────────────────────────────────────────────────────────── */
async function submitForm() {
  const alertEl  = document.getElementById('step3-alert');
  const voucherId = document.getElementById('voucher-id').value.trim();
  alertEl.style.display = 'none';

  if (!voucherId)  { showAlert(alertEl, 'Please enter the Voucher ID.', 'danger'); return; }
  if (!selectedFee){ showAlert(alertEl, 'Please select a fee payment status.', 'danger'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting…';

  try {
    await fetchAPI('/api/forms/', {
      method: 'POST',
      body: JSON.stringify({
        student_id: currentStudent.id,
        voucher_id: voucherId,
        fee_status: selectedFee,
        notes: document.getElementById('form-notes').value.trim() || null,
      }),
    });
    document.getElementById('success-msg').innerHTML =
      `Form for <strong>${currentStudent.name}</strong> (${currentStudent.ag_number}) submitted successfully.<br>
       Fee Status: ${feeStatusBadge(selectedFee)} &nbsp; Voucher: <strong>${voucherId}</strong>`;
    setStep(4);
  } catch (err) {
    showAlert(alertEl, `❌ ${err.message}`, 'danger');
    btn.disabled = false;
    btn.innerHTML = '✅ Submit UG-1 Form';
  }
}

function processAnother() {
  currentStudent = null;
  selectedFee    = null;
  document.getElementById('voucher-id').value = '';
  document.getElementById('form-notes').value = '';
  ['Paid','Installment','Deferred'].forEach(s =>
    document.getElementById(`fee-${s.toLowerCase()}`).className = 'fee-btn'
  );
  setStep(1);
  setTimeout(() => document.getElementById('barcode-input')?.focus(), 100);
}

/* ─── Helper ─────────────────────────────────────────────────────────────── */
function showAlert(el, msg, type) {
  el.className = `alert alert-${type}`;
  el.innerHTML = msg;
  el.style.display = 'flex';
}

init();
