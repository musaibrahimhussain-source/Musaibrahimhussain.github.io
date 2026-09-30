import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, '..', 'data', 'mediroutine.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export function createDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dose TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      specialty TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'upcoming',
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS dose_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'taken',
      note TEXT,
      FOREIGN KEY (medication_id) REFERENCES medications(id)
    );

    CREATE TABLE IF NOT EXISTS health_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      metric TEXT NOT NULL,
      series TEXT NOT NULL,
      value REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);

  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM patients').get().n;
  if (count > 0) return;

  const insertPatient = db.prepare(
    'INSERT INTO patients (name, initials, avatar_color, role) VALUES (?, ?, ?, ?)'
  );

  const patientId = Number(insertPatient.run('Musa Ibrahim Hussain', 'M', '#8A72F6', 'patient').lastInsertRowid);

  const medications = [
    { name: 'Metformin', dose: '500 mg', scheduled_time: '09:00' },
    { name: 'Atorvastatin', dose: '20 mg', scheduled_time: '09:00' },
    { name: 'Vitamin D3', dose: '1000 IU', scheduled_time: '09:00' },
    { name: 'Lisinopril', dose: '10 mg', scheduled_time: '13:00' },
    { name: 'Omega-3', dose: '1000 mg', scheduled_time: '13:00' },
    { name: 'Aspirin', dose: '81 mg', scheduled_time: '19:00' },
    { name: 'Melatonin', dose: '5 mg', scheduled_time: '19:00' }
  ];

  const insertMed = db.prepare(
    'INSERT INTO medications (patient_id, name, dose, scheduled_time) VALUES (?, ?, ?, ?)'
  );
  for (const m of medications) {
    insertMed.run(patientId, m.name, m.dose, m.scheduled_time);
  }

  // Seed 'taken' logs for the 4 morning doses so the donut shows 4 of 7
  const medIds = db.prepare('SELECT id, scheduled_time FROM medications WHERE patient_id = ?').all(patientId);
  const takenMorning = medIds.filter(m => m.scheduled_time === '09:00').slice(0, 4);
  const insertLog = db.prepare(
    'INSERT INTO dose_logs (medication_id, logged_at, status, note) VALUES (?, datetime("now", "localtime"), ?, ?)'
  );
  for (const m of takenMorning) {
    insertLog.run(m.id, 'taken', null);
  }

  const insertAppt = db.prepare(
    'INSERT INTO appointments (patient_id, provider, specialty, date, time, note, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertAppt.run(
    patientId,
    'Dr. Smith',
    'Cardiologist',
    '2026-10-26',
    '10:30 AM',
    'Remember to bring your latest blood pressure readings to the appointment.',
    'upcoming'
  );

  // Health trends — blood pressure (systolic) + heart rate series
  const insertTrend = db.prepare(
    'INSERT INTO health_trends (patient_id, metric, series, value, recorded_at) VALUES (?, ?, ?, ?, ?)'
  );
  const bp = [118, 121, 119, 125, 123, 128, 126, 130, 127, 124, 126, 129];
  const hr = [72, 74, 71, 76, 78, 75, 73, 77, 74, 72, 75, 73];
  const hr2 = [68, 70, 66, 71, 73, 70, 69, 72, 70, 67, 70, 68];
  for (let i = 0; i < bp.length; i++) {
    const date = `2026-09-${String(i + 19).padStart(2, '0')}`;
    insertTrend.run(patientId, 'Blood Pressure', 'systolic', bp[i], date);
    insertTrend.run(patientId, 'Heart Rate', 'resting', hr[i], date);
    insertTrend.run(patientId, 'Heart Rate', 'active', hr2[i], date);
  }
}