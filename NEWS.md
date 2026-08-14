## [Release] v1.7.0 – 2026-08-14

Quiz-reliability hardening, a deployment-stack move to **Caddy**, tighter session
handling, the first real automated test suites, and a bilingual user guide. No
breaking change to the app's own behaviour — but **operators must re-read the deploy
docs**: the reverse proxy is now Caddy and the backend/frontend no longer expose
public ports.

Versions: frontend `1.6.6 → 1.7.0`, backend `1.0.5 → 1.1.0`, models `1.1.0`.

### Highlights

- **Deployment & Infrastructure**
  - Introduced **Caddy** as the reverse proxy, defined in-repo; dropped public
    backend/frontend ports (reverse-proxy only); Caddy cert data in a bind mount
  - Backend image: added `HEALTHCHECK`, stopped baking secrets in, fixed
    `SERVER_PORT` ARG; fixed the `REQUIRES_OFFLINE_SCOPE` toggle comparison
  - `deployment.sh` hardened: clean `node_modules` before `npm ci`, npm-cache
    guard against `EEXIST`, honest per-host banner; skip request logging for `/ping`

- **Authentication & Sessions**
  - Reject expired sessions in `bearerValid`; await session persistence before
    completing the WS handshake / responding; block/unblock by user uid (not
    fingerprint uid); wrap `CreateQuiz` in try/catch

- **Quiz reliability**
  - Eliminated a question-subset race — runs are assembled from a race-free
    `GetRun` instead of the partially-hydrated frontend cache (fixes truncated runs
    persisted to MongoDB); fixed the question repetition/reset glitch; guarded
    counter regressions in `SetQuiz`/`StartQuiz`; made CurrentQuiz/LocalUser actors
    resilient to handler exceptions and supervisor shutdown

- **Testing**
  - Backend actor tests (Quiz/Question/Comment) with MongoDB mock infrastructure;
    frontend Tier 1–3 unit tests

- **Documentation & Branding**
  - Bilingual (DE/EN) VitePress **user guide** content; Recapp brand colour and
    language switcher; Recapp logos across headers/login/activate

- **Dependencies**
  - react-router 6→7; `ip-address` SSRF override; Dependabot modernization waves
    and triage (grouped minor/patch, deferred majors)

---

## [Release] v1.6.6 – 2026-05-15

*Consolidates a long dev-tag period (`1.6.5-testing`, `-OHT-002/003`,
`1.6.6-20260515`).*

### Highlights

- **Testing & CI**
  - New Vitest setup with a CI workflow and coverage reporting; resolved
    pre-existing frontend ESLint errors; models schema tests

- **Documentation**
  - TypeDoc API docs published to GitHub Pages; docs build workflow

- **Quiz reliability**
  - Route `UnstallQuestions` to `QuizActor` and guard against unknown tags;
    prevent the previous quiz/question flashing on navigation; clean quiz-delete
    unsubscribe; timestamp comparisons via `DateTime.toMillis()`; quiz-load gating

- **Backend & Infrastructure**
  - Structured logging via Winston with PII removed; hardened `authLogin` error
    handling; backend health-check retries; restart policies; DB + backend logging
    config; deployment-script refactor; docker network settings

- **Models**
  - Declare `unionize` as an explicit dependency; `@recapp/models` → 1.1.0

---

## [Release] v1.6.5 – 2025-06-30

### Highlights

- **Frontend**
  - Consistency check for missing questions on the quiz page
  - Route guard protecting the Dashboard
  - Handle validation errors on quiz update; fix statistics-actor registration

---

## [Release] v1.6.4 – 2025-06-23

### Highlights

- **Authentication**
  - Break an infinite token-refresh loop by returning the expiry timestamp

---

## [Release] Merge main into production – 2025-06-11

We have deployed a new version to production! This release merges the latest changes from the `main` branch, bringing new features, improvements, and bug fixes.

### Highlights

- **Deployment & Workflow**
  - New workflow for deploying to the test server: `.github/workflows/deploy-test.yml`
  - Old deployment check workflow removed: `.github/workflows/deploy-check.yml`
  - Major refactor of `deployment.sh` for easier log management and improved robustness

- **Backend**
  - Backend Dockerfile now uses `node:20-slim` (was `node:20-alpine`)
  - Added `wkhtmltopdf` and related font support to backend Docker image
  - Backend version bumped to 1.0.1

- **Frontend**
  - Improved token refresh and handling in `TokenActor.ts` for more reliable authentication
  - Modernized app root handling and user experience (`Root.tsx`): better error handling and loading screen
  - Only enable question stats in quiz tab if details are available
  - Frontend version bumped to 1.6.3

---

For a complete list of changes, see the [commit history between `main` and `production`](https://github.com/ecomod-code/recapp/pull/93).
