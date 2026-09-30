# Base44 Dev Environment

## Project Overview
This is a GitHub Pages static site (`Musaibrahimhussain.github.io`). The repo contains a single `index.html` served by nginx.

## Running the App
```
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: http://localhost:3000
- nginx serves the bind-mounted repo root, so edits to `index.html` (or other static files) are live — call `reload_preview` to refresh the preview iframe.

## Healthcheck
nginx healthcheck uses `wget --spider http://localhost:80/`.

## Notes
- No build step, no dependencies, no secrets required.
- The original commit (99fea27) contained only a `README.md` with no servable content — that was the cause of the startup failure.
