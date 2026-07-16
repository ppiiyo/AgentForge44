# ADR 0008: Pipeline Executor Consolidation

## Status
Accepted — 2026-07-16

## Context
Two implementations existed:
- `src/api/engine/PipelineExecutor.ts` (older, tightly coupled to HTTP layer)
- `src/services/pipeline/PipelineExecutor.ts` (newer, domain-isolated)

Duplicate implementations caused runtime unpredictability depending on import path.

## Decision
Keep `src/services/pipeline/PipelineExecutor.ts` as sole canonical implementation.
Delete `src/api/engine/PipelineExecutor.ts`.

## Consequences
+ Single source of truth
+ Domain-driven layout preserved
- Migration required for all import paths (completed successfully)
