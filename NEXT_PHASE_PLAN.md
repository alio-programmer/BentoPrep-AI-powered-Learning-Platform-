# Next Phase Plan — Gamification + Daily Study Session + Companies

Phase planned for the next working session. Three features, all client (React/Vite) + server (Express/Supabase).

## Step 0 — DB migration (`server/src/schema.sql`)
- Append an `achievements` table: `user_id`, `code`, `title`, `description`, `earned_at`, unique (`user_id`, `code`).
- Add RLS policy + index.
- Must be run in the Supabase SQL editor.
- `study_sessions` table already exists (see `schema.sql:136`) — no migration needed.

## Step 1 — Gamification (Dashboard card only)
- **Server**
  - `server/src/services/gamification.js` — derive XP (Easy 10 / Medium 20 / Hard 30 per problem, +5 per review, +25 per study session, +10 per roadmap day), level from XP thresholds, weekly goal stats, achievement catalog, lazy award logic.
  - `server/src/routes/gamification.js` — `GET /api/gamification`, `POST /api/gamification/award`.
  - Mount in `server/src/index.js`.
- **Client**
  - `client/src/pages/Dashboard.jsx` — "Level & XP" card with progress bar + earned badge chips.

## Step 2 — Daily Study Session (CTA + Quick Actions only)
- **Server**
  - `server/src/routes/session.js` — `GET /api/session` (today's dsa/sql/resume roadmap days + due memory cards + reviews count + today's session row) and `POST /api/session` (upsert `minutes` / `confidence` / `completed` on `(user_id, session_date)`).
- **Client**
  - `client/src/pages/Session.jsx` at `/session` — distraction-free flow: mission checklist → inline flashcard review (reuse `FlashCard.jsx`) → reflection (minutes + 1–5 confidence) → complete (marks today's roadmap day done via existing `PUT /roadmap/days/:id`).
  - Update Dashboard "Start Today's Session" CTA (`client/src/pages/Dashboard.jsx:132`) → `/session`; add to Quick Actions.

## Step 3 — Companies (AI-key roadmap)
- **Server**
  - `server/src/data/companies.js` — static catalog of ~10 companies (Google, Amazon, Microsoft, Meta, Apple, Netflix, Uber, Adobe, Atlassian, Databricks) with focus topics, interview rounds, prep areas, blurb.
  - `server/src/routes/companies.js` — `GET /api/companies`, `GET /api/companies/:name`, `POST /api/companies/:name/roadmap` (reuses `generateAiRoadmap` in `server/src/services/roadmap.js`; requires an AI API key like the resume track).
- **Client**
  - `client/src/pages/Companies.jsx` (`/companies`) — card grid.
  - `client/src/pages/CompanyDetail.jsx` (`/companies/:name`) — hero, focus topics highlighted against user's topic performance (from `/analytics`), interview rounds, "Generate company roadmap" form (duration + hours) with active-plan progress.
  - Add "Companies" nav item to `client/src/components/Layout.jsx`.

## Step 4 — Verify & deploy
- `npm run build` in `client`.
- Restart server + manual smoke test.
- Commit + push to GitHub (existing remote `origin`, branch `master`).
