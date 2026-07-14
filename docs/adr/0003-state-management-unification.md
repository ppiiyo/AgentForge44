# ADR 0003: State Management Unification Strategy

## Status
Accepted

## Context
In the development of the KostromAi44 user interface, state management was split between:
1. **Unused Modular Slices**: `editorSlice.ts`, `pipelineSlice.ts`, and `uiSlice.ts` which defined states but were never actively integrated.
2. **Focused Individual Stores**: `useEditorStore.ts`, `usePipelineStore.ts`, and `useUIStore.ts` which handled operational frontend state directly.
3. **Facade Store**: `useAgentStore.ts`, which acted as a convenient, unified interface proxying accessors and actions to the individual stores.

This split introduced duplicate files and architectural confusion over which pattern (Slice-based vs. Facade-based Focused Stores) was authoritative.

## Decision
We chose **Option B (Multiple Focused Stores with Facade/Proxy Facet)**:
- **Authorization**: Keep `useEditorStore`, `usePipelineStore`, and `useUIStore` as the authoritative stores.
- **Unified Interface**: Keep `useAgentStore` as the central unified facade proxy to simplify access in React hooks and components.
- **Dead Code Deletion**: Completely delete `/src/store/editorSlice.ts`, `/src/store/pipelineSlice.ts`, and `/src/store/uiSlice.ts`.
- **Test Alignment**: Updated `src/tests/store-slices.test.ts` to reflect the unified facade pattern testing.

## Consequences
- **Zero Redundancy**: All unreferenced slice files have been removed, eliminating code duplication.
- **Consistent DX**: Developers use the simple unified `useAgentStore` facade or focused stores directly, with clear separation of concerns.
- **Stable Test Coverage**: Store test suites remain fully green with no broken flows.
