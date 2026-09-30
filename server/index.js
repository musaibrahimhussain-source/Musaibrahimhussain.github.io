import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDatabase } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const db = createDatabase();

// ---- Dashboard summary ----
app.get('/api/dashboard', (req, res) => {
  const patient = db.prepare("SELECT * FROM patients WHERE role = 'patient' LIMIT 1").get();
  const medications = db
    .prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY scheduled_time')
    .all(patient.id);

  const appointments = db
    .prepare("SELECT * FROM appointments WHERE patient_id = ? AND status = 'upcoming' ORDER BY date LIMIT 1")
    .get(patient.id);

  const trends = db
    .prepare('SELECT * FROM health_trends WHERE patient_id = ? ORDER BY recorded_at')
    .all(patient.id);

  // doses taken today
  const todayLogs = db
    .prepare("SELECT medication_id FROM dose_logs WHERE date(logged_at) = date('now','localtime')")
    .all();

  const takenCount = todayLogs.length;
  const totalCount = medications.length;

  res.json({
    patient,
    medications,
    appointments: appointments ? [appointments] : [],
    trends,
    totals: { takenCount, totalCount }
  });
});

// ---- Mark a dose as taken ----
app.post('/api/medications/:id/take', (req, res) => {
  const { id } = req.params;
  const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
  if (!med) return res.status(404).json({ error: 'Medication not found' });

  db.prepare("INSERT INTO dose_logs (medication_id, logged_at, status, note) VALUES (?, datetime('now','localtime'), 'taken', ?)")
    .run(id, req.body?.note || null);

  // count today's taken
  const takenCount = db
    .prepare("SELECT COUNT(*) AS n FROM dose_logs WHERE date(logged_at) = date('now','localtime')")
    .get().n;
  const totalCount = db.prepare('SELECT COUNT(*) AS n FROM medications WHERE patient_id = ?').get(med.patient_id).n;

  res.json({ success: true, totals: { takenCount, totalCount } });
});

// ---- Medication log (all logged doses, newest first) ----
app.get('/api/logs', (req, res) => {
  const logs = db.prepare(`
    SELECT dose_logs.id, dose_logs.status, dose_logs.logged_at, dose_logs.note,
           medications.name, medications.dose, medications.scheduled_time
    FROM dose_logs
    JOIN medications ON medications.id = dose_logs.medication_id
    ORDER BY dose_logs.logged_at DESC
  `).all();

  res.json({ logs });
});

// ---- Book appointment ----
app.post('/api/appointments', (req, res) => {
  const { provider, specialty, date, time, note } = req.body;
  const patient = db.prepare("SELECT * FROM patients WHERE role = 'patient' LIMIT 1").get();

  const result = db.prepare(
    "INSERT INTO appointments (patient_id, provider, specialty, date, time, note, status) VALUES (?, ?, ?, ?, ?, ?, 'upcoming')"
  ).run(patient.id, provider, specialty, date, time, note);

  res.json({ success: true, id: result.lastInsertRowid });
});

// ---- AI assistant placeholder (scaffolded; requires integration credits) ----
app.post('/api/assistant', (req, res) => {
  res.status(503).json({
    error: 'AI assistant is unavailable. Workspace integration credits are exhausted — they reset on 2026-10-01 or after upgrading. This is a billing limitation, not an app bug.'
  });
});

// Serve static frontend
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mediroutine AI listening on ${PORT}`);
});