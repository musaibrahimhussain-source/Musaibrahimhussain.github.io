# Base44 Dev Environment

## Project Overview
Mediroutine AI — a full-stack health & medication management app.
- Backend: Node.js (ESM) + Express + better-sqlite3 (`server/`).
- Frontend: vanilla JS single-page dashboard served from `public/`.
- DB: SQLite file at `data/mediroutine.db`, auto-created and seeded.
- Mobile: Capacitor wrapper configured (`capacitor.config.json`, `MOBILE-GUIDE.md`).

## Running the App
```
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: http://localhost:3000 (Express serves API + static frontend).
- The compose `command` runs `npm install` then `npm run start` (not a live-reload
  dev server). After edits to `server/`, restart the container:
  `docker compose -f docker-compose.base44.yml restart web`.
- Frontend static files in `public/` are served live on request (no reload needed);
  call `reload_preview` if you want to see a fresh render.

## API (all relative to the web entry point)
- `GET /api/dashboard` — patient, medications, next appointment, health trends, today's doses.
- `POST /api/medications/:id/take` — log a dose as taken.
- `GET /api/logs` — recent dose log entries.
- `POST /api/appointments` — book an appointment.
- `POST /api/assistant` — AI assistant; **returns 503 while workspace Integration
  credits are exhausted** (billing limit, not a bug; resets 2026-10-01).

## SQL quirk
better-sqlite3 treats `"double quotes"` as identifiers, not string literals.
All SQL string literals must be single-quoted inside double-quoted JS strings
(e.g. `"SELECT ... WHERE role = 'patient'"`). Do not reintroduce double-quoted
literals in SQL.

## Healthcheck
Compose healthcheck hits `GET /api/dashboard` and expects a 2xx.

## Notes
- `node_modules` is installed by the container at startup (not committed).
- Capacitor `android/` and `ios/` folders are generated locally and gitignored.
- The base44 preview is a dev environment; the app has no production URL yet.