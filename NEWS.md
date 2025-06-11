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
