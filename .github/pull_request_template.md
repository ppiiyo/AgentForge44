## Description
Provide a concise, high-level summary of the modifications implemented, the motivation behind them, and any design choices.

## Related Issues
Closes # (issue reference or description)

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] 🚀 New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update (no code changes)
- [ ] ⚙️ Chore / Refactor (structural modifications, dependency bumps, or pipeline improvements)

## Scope & Technical Verification Checklists
Please verify that your contributions align with the project constraints and best practices before request review:

### 🎨 User Experience (UX) & Frontend
- [ ] **States Integrity**: Explicit handling of all component states: `Loading`, `Empty State`, `Error State`, and `Success/Loaded`.
- [ ] **Error Exposure**: Internal exception stack traces, database schemas, raw HTTP code words, or API internals are **strictly hidden** from the client view.
- [ ] **Humanized Copy**: User-facing copy contains readable, actionable, and friendly text explaining how to resolve failures.
- [ ] **Accessibility (a11y)**: Meets WCAG AA standards (font contrast, focus states, interactive keyboard navigation).
- [ ] **Optimistic UI**: Implemented where interactive transitions could feel slow (like toggle switches, status updates).

### 🛡️ Security & Access Control
- [ ] **Secrets & Keys**: Absolute zero hardcoded secrets or third-party API tokens in the source files.
- [ ] **Input Validation**: All client payloads are sanitized and strictly validated against a schema before processing.
- [ ] **Authorization (RBAC/JWT)**: Sensitive routes are guarded by appropriate middleware verifying user identity and permissions.
- [ ] **Rate Limiting**: Public or computationally heavy API endpoints are protected against abuse.

### ⚙️ System, Databases & Architecture
- [ ] **Connection Pooling**: Database connection instances are properly released and never leak.
- [ ] **N+1 Query Prevention**: Batch loading (or preloading) is used where collections are referenced.
- [ ] **Transactional Integrity**: Multi-write operations are wrapped securely in transactional statements to prevent partial state corruption.
- [ ] **Resilience**: Downstream third-party integration calls have explicit Timeouts, Circuit Breakers, and Retries with Exponential Backoff configured.

### 💻 Developer Experience (DX) & CI/CD
- [ ] **Type Safety**: Proper TypeScript types or interfaces declared for all data structures (no arbitrary `any`).
- [ ] **Lint & Format**: Clean static check pass via `npm run lint` and code is consistently formatted using Prettier.
- [ ] **Migration Check**: Database migrations (Drizzle/Postgres) are fully aligned, generated, and verified.

## Testing Strategy
Describe the tests that you ran to verify your changes. Provide instructions so we can reproduce.

- [ ] **Unit / Integration Tests**: Ran and passed via `npm run test`.
- [ ] **E2E Tests**: Ran and verified via Playwright (`npm run test:e2e`).
- [ ] **Production Build**: Verified that `npm run build` completes with zero compilation issues.

## Screenshots / Evidence (if applicable)
Add visual evidence of the correct implementation (UI screenshots, responsive layouts, or diagnostic test logs).

