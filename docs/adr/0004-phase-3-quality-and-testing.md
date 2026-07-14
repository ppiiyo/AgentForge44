# ADR 0004: Phase 3 — Quality & Testing Gates

## Status
Accepted

## Context
As the `KostromAi44` (AgentForge44) orchestrator scales to enterprise production readiness, it is critical to implement robust, automated, and deterministic quality gates in CI/CD. The existing testing pipeline lacked:
1. **Strict Code Coverage Enforcement**: No automated build-failure mechanisms if code coverage dropped below specified quality targets.
2. **Postgres & Redis Integration for E2E Tests**: Playwright E2E tests were executed without structured database and cache isolation, leading to potential state pollution.
3. **Daily/Nightly Load Testing**: Load-testing scenarios using `k6` were present in the codebase but not executed as scheduled nightly regression checks.
4. **Contract/OpenAPI Verification**: No automated contract tests to verify that backend API responses conform strictly to the public-facing `swagger.json` OpenAPI schemas.

## Decision
We implemented a complete Quality & Testing hardening suite to address these gaps:

### 1. Hardened Coverage Targets (Vitest)
- Adjusted `vite.config.ts`'s Vitest configuration to enforce a strict quality floor:
  - Lines: >= 75%
  - Branches: >= 70%
  - Functions: >= 75%
  - Statements: >= 75%
- Modified `/package.json` to configure the `test:coverage` command as the default verification step in the CI pipeline.

### 2. Isolated E2E Service Orchestration (Playwright)
- Updated `.github/workflows/ci.yml` to run Playwright E2E tests in a dedicated job with standard PostgreSQL (v15) and Redis (v7) container services.
- Added automatic trace and screenshot capture on test failures to aid in rapid debugging.
- Configured a lightweight "Critical Flows Only" filter (`--grep "1\."`) for PR-level validation, leaving the exhaustive full-suite execution for merges to the `main` branch.

### 3. Automated Contract Testing (OpenAPI Verification)
- Introduced a dedicated contract test suite `/src/tests/contract-openapi.test.ts` to validate that the backend REST route payload definitions align perfectly with the schemas documented in `swagger.json`.
- Configured automated SDK regeneration steps during releases.

### 4. Nightly Load-Testing Pipeline
- Created a separate nightly/scheduled GitHub action (`/.github/workflows/load-test.yml`) to execute `k6` load and soak scenarios against the staging environment.
- Configured the workflow to alert and fail the pipeline if P95 latency regresses by more than 15% against rolling historic benchmarks.

## Consequences
- **Preventative Regression Defenses**: Quality regressions are caught before they reach production.
- **Deterministic E2E Verification**: Multi-user and queue scenarios are executed in isolated, authentic environments.
- **Improved Observability**: Playwright failure artifacts are preserved securely on GitHub, and k6 metrics are routed cleanly to Grafana.
