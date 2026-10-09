# Lewolux Studio – Website

Quellcode und fertige Dateien der Website **https://lewolux.de**.

- `public/` – die fertige Website. Cloudflare veröffentlicht diesen Ordner automatisch bei jedem Push auf `main`.
- `quelle/` – Generator (`build.py`), Texte (`data.py`, `manuals.py`), Vorlagen (`parts/`), echte Screenshots.
- `community.js` – freiwillige Konten (Login mit Google, Freunde, Chat, Favoriten, Spielzeit). Einrichtung und Admin-Export: `COMMUNITY-README.md`.
- `quelle/feedback-worker/` – Umfrage & Feedback (Cloudflare Worker + D1, läuft unter api.lewolux.de).

Ein privates, nicht-kommerzielles Hobbyprojekt.

## Updates

Jeder Push auf `main` wird von Cloudflare automatisch veröffentlicht (Workers Builds, `npx wrangler deploy`).
