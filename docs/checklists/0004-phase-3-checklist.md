# Phase 3 PR Checklist & Release Guide: Quality and Testing Gates

## Scope of Changes
This release introduces automated code coverage gates, Playwright E2E database orchestration in CI/CD, OpenAPI contract testing, and a scheduled load-testing pipeline.

### Files Touched
- `/vite.config.ts`: Enforce strict coverage thresholds under `test.coverage.thresholds`.
- `/.github/workflows/ci.yml`: Integrate coverage gates in test step, orchestrate isolated Postgres/Redis services, filter E2E PR runs, and upload Playwright artifacts.
- `/.github/workflows/load-test.yml`: Created nightly load-testing run with threshold comparison against historical trends.
- `/src/tests/contract-openapi.test.ts`: Created contract/OpenAPI route-schema conformity test.

---

## Migration Steps
1. **Vitest Coverage Check**:
   Confirm locally that coverage thresholds are met by executing:
   ```bash
   npm run test:coverage
   ```
2. **Playwright Integration Verification**:
   Verify that local E2E tests pass correctly on port 3000:
   ```bash
   npm run test:e2e
   ```
3. **OpenAPI Schema Check**:
   Confirm that routes and Zod schemas align perfectly with the generated specification:
   ```bash
   npx tsx scripts/generate-swagger.ts
   npm run test
   ```

---

## Rollback & Backout Plan
If any quality gate blocks hotfixes or leads to unexpected pipeline failures:
1. **Bypass Coverage Gates**:
   TEMPORARILY revert thresholds in `vite.config.ts` or run `npm run test` instead of `npm run test:coverage` in `.github/workflows/ci.yml`.
2. **Bypass Playwright Services**:
   Comment out the `services:` block in `.github/workflows/ci.yml` and run against local SQLite.
3. **Disable Contract Tests**:
   Skip `src/tests/contract-openapi.test.ts` by appending `.skip` to the top-level block.
