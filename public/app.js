// API base — defaults to the current origin (same as before).
// Set window.MEDIROUTINE_API_URL before this script loads to point the
// mobile build (Capacitor) at your deployed backend.
const API = (window.MEDIROUTINE_API_URL || '').replace(/\/$/, '');

let state = {
  patient: null,
  medications: [],
  appointments: [],
  trends: [],
  totals: { takenCount: 0, totalCount: 0 }
};

const ARC_CIRCUM = 314; // 2 * PI * r (r=50)

function $(sel) { return document.querySelector(sel); }

async function loadDashboard() {
  const res = await fetch(`${API}/api/dashboard`);
  state = await res.json();
  renderAll();
}

// ---- Rendering ----
function renderAll() {
  const p = state.patient;
  if (p) {
    $('#avatar').textContent = p.initials;
    $('#footer-name').textContent = p.name;
  }

  const { takenCount, totalCount } = state.totals;
  $('#meds-count').textContent = totalCount;
  $('#meds-sub').textContent = `${totalCount} medications scheduled for today`;
  $('#donut-num').textContent = `${takenCount}/${totalCount}`;

  // donut progress
  const pct = totalCount ? takenCount / totalCount : 0;
  const arc = $('#arc');
  const dash = ARC_CIRCUM * pct;
  arc.setAttribute('stroke-dasharray', `${dash} ${ARC_CIRCUM - dash}`);
  arc.style.transition = 'stroke-dasharray 0.4s ease';

  // dose pills
  const pills = $('#dose-pills');
  pills.innerHTML = '';
  state.medications.forEach((med, i) => {
    const btn = document.createElement('button');
    btn.className = 'dose-pill';
    btn.textContent = med.scheduled_time;
    // mark first 4 as already taken visually (matches seed)
    if (i < takenCount) btn.classList.add('taken');
    btn.addEventListener('click', () => takeMedication(med.id, btn));
    pills.appendChild(btn);
  });

  // appointments
  const apptBox = $('#appointments-card');
  if (state.appointments.length) {
    const a = state.appointments[0];
    apptBox.innerHTML = `
      <div class="appt-line">
        <div>
          <div class="appt-provider">${a.provider} <span style="color:var(--muted);font-weight:400;">(${a.specialty})</span></div>
          <div class="appt-specialty">${a.date}</div>
        </div>
        <div class="appt-time">${a.time}</div>
      </div>
      ${a.note ? `<div class="appt-note">${a.note}</div>` : ''}
    `;
  }

  renderCharts();
  renderLogs();
}

function renderCharts() {
  const bp = state.trends.filter(t => t.metric === 'Blood Pressure');
  const hr = state.trends.filter(t => t.metric === 'Heart Rate');
  drawLine('#chart-bp', bp.map(t => t.value), '0D5C75');
  drawLine('#chart-hr', hr.map(t => t.value), '0D5C75');
}

function drawLine(sel, values, color) {
  const svg = $(sel);
  if (!values.length) { svg.innerHTML = ''; return; }
  const W = 300, H = 120, pad = 6;
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  svg.innerHTML = `
    <path d="${d}" fill="none" stroke="#${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function renderLogs() {
  const tbody = $('#log-body');
  fetch(`${API}/api/logs`)
    .then(r => r.json())
    .then(({ logs }) => {
      tbody.innerHTML = logs.slice(0, 5).map(l => `
        <tr><td>${l.name}</td><td>${l.logged_at}</td></tr>
      `).join('') || '<tr><td colspan="2" style="color:var(--muted)">No logs yet.</td></tr>';
    });
}

// ---- Actions ----
async function takeMedication(id, btn) {
  const res = await fetch(`${API}/api/medications/${id}/take`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (data.success) {
    btn.classList.add('taken');
    state.totals = data.totals;
    $('#donut-num').textContent = `${data.totals.takenCount}/${data.totals.totalCount}`;
    const pct = data.totals.takenCount / data.totals.totalCount;
    const arc = $('#arc');
    arc.setAttribute('stroke-dasharray', `${ARC_CIRCUM * pct} ${ARC_CIRCUM - ARC_CIRCUM * pct}`);
    renderLogs();
    showToast('Dose marked as taken');
  }
}

// Booking modal
function openModal() { $('#modal-backdrop').classList.add('open'); }
function closeModal() { $('#modal-backdrop').classList.remove('open'); }
$('#book-btn').addEventListener('click', openModal);
$('#modal-cancel').addEventListener('click', closeModal);
$('#modal-backdrop').addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') closeModal(); });
$('#modal-submit').addEventListener('click', async () => {
  const payload = {
    provider: $('#b-provider').value,
    specialty: $('#b-specialty').value,
    date: $('#b-date').value,
    time: $('#b-time').value,
    note: $('#b-note').value
  };
  if (!payload.provider || !payload.date) { showToast('Provider and date are required.'); return; }
  const res = await fetch(`${API}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.success) {
    closeModal();
    ['#b-provider','#b-specialty','#b-date','#b-time','#b-note'].forEach(s => $(s).value = '');
    showToast('Appointment booked!');
    loadDashboard();
  }
});

// -- Mark first available (untaken) med as taken --
$('#mark-taken').addEventListener('click', () => {
  const pills = [...$('#dose-pills').querySelectorAll('.dose-pill')];
  const next = pills.find(p => !p.classList.contains('taken'));
  if (next) next.click();
  else showToast('All doses taken today. Nice work!');
});

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

loadDashboard();