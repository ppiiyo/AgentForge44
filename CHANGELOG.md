# Changelog

All notable changes to the `KostromAi44` (AgentForge44) orchestrator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] - 2026-07-14
### Added
- **Quality Gates & Coverage Enforcements**: Configured strict minimum coverage targets (Lines >= 75%, Branches >= 70%, Functions >= 75%, Statements >= 75%) to prevent regressions in production modules.
- **Contract Schema Testing**: Implemented `/src/tests/contract-openapi.test.ts` to guarantee route definitions and Zod structures are in lockstep with the generated `swagger.json` OpenAPI specs.
- **E2E Playwright Service Integration**: Added complete PostgreSQL (v15) and Redis (v7) service orchestration to isolated E2E jobs within the GitHub actions.
- **PR Filtering**: Configured Playwright run filters to only run Critical Path tests (`--grep "1\."`) on PRs, reserving the full comprehensive suite for main branches.
- **Nightly Performance Checks**: Created `/.github/workflows/load-test.yml` running nightly `k6` load and soak scenarios with automatic threshold regressions comparison.

---

## [0.3.0] - 2026-07-11
### Added
- **State Management Facade**: Integrated unified Zustand application state management with a central facade `useAgentStore.ts` acting as a single entry point proxy.
- **ADR 0003**: Published architectural documentation for Zustand state management unification.

---

## [0.2.0] - 2026-07-09
### Added
- **Zod Environment Validation**: Centralized environment variable management with rigid schemas (`src/config/env.ts` and `src/config/envValidator.ts`).
- **ADR 0001 & ADR 0002**: Published architecture guidelines for database persistence and baseline configuration.
- **Test Optimization**: Corrected development dependency constraints for Vitest and SQLite adapter setups.
