# ADR 0002: Phase 1 — P0 Blockers and Hygiene Stabilization

## Status
Accepted

## Context
In Phase 1, several high-risk configuration, maintenance, and duplicate patterns were identified that could compromise production deployments, introduce security risks, and lead to circular or dead-code resolution paths. Specifically:
1. **Hardcoded Port Settings**: The Express server used a hardcoded port (`const PORT = 3000`), blocking container customization and violating twelve-factor app paradigms.
2. **Scattered Environment Logic**: `process.env` properties were accessed at random across the codebase without structural verification or pre-flight fail-fast gates.
3. **Redundant Code and Proxies**: Multiple components, such as `errorHandler.ts`, `PipelineExecutor.ts`, and `RetryService.ts`, existed in duplicated or forwarding files.
4. **Non-Standard Import Path Styles**: Mixtures of `.ts` and `.js` extensions across files broke ESM native resolution during production execution.
5. **Atypical DepdevDependencies**: Invalid version identifiers (such as `vitest ^4.1.8`) caused lookups to resolve to non-existent releases.

## Decision
We executed a complete hygiene sweep to eliminate these blockers permanently:

### 1. Configuration & PORT Centralization
- **Flexible Port Mapping**: Changed the hardcoded `PORT` assignment in `/server.ts` to `parseInt(process.env.PORT ?? '3000', 10)`, supporting environment-driven port assignment for Cloud Run.
- **Unified Zod Validation Schema**: Introduced `/src/config/env.ts` with a Zod schema to parse, validate, and typecast configuration parameters. Integrated this check synchronously into the `/src/config/envValidator.ts` pre-flight startup process, enabling immediate startup failures if production secrets are missing.

### 2. Elimination of Duplicate & Forwarder Files
- **Logger Consolidation**: Moved the full implementation of the Winston log wrapper from `/src/services/logger.ts` to `/src/utils/logger.ts`, then removed the duplicate `/src/services/logger.ts` and updated all internal service files.
- **Unused Error Handlers**: Removed the redundant `/src/server/middleware/errorHandler.ts` and successfully deleted the empty `/src/server` tree.
- **Retry Service Consolidation**: Deleted `/src/api/services/RetryService.ts` and redirected all strategy and executor modules to import from the direct source `/src/services/retry/RetryService.js`.

### 3. ESM Native Import Compliance
- Replaced all raw `.ts` imports (e.g., in `/server.ts`, `/src/main.tsx`, `/src/utils/validation.ts`) with their compiled ESM native `.js` equivalents to ensure consistent resolution.

### 4. Dependency Pinning
- Pinned Vitest and its coverage package to their actual stable release versions (`^3.0.5`) in `/package.json`.

## Consequences
- **Production Readiness**: The platform can now run securely in containerized Kubernetes or Cloud Run nodes on arbitrary ports.
- **Lower Maintenance Overhead**: Deleting 5 duplicated/forwarder files and cleaning import paths significantly lowered circular dependency risk.
- **Strict Verification**: Every single test and build continues to execute successfully, preserving backward compatibility.
