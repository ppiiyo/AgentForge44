# ADR 0007: Phase 6 - Delivery & Platform Engineering

## Status
Accepted

## Context
As the KostromAi44 (AgentForge44) application matures to an enterprise-scale production platform, we need repeatable infrastructure provisioning, zero-downtime Canary deployments, dynamic configuration capabilities, reproducible SRE setups, and reliable rollback workflows to achieve continuous delivery (CD) safety.

## Decisions
We have implemented a comprehensive production-grade Delivery & Platform architecture:

1. **Modular Infrastructure (Terraform Modules)**:
   - Extracted and modularized VPC, KMS, EKS, RDS PostgreSQL, and ElastiCache Redis resource declarations from the monolithic `/terraform/main.tf` into self-contained modules under `/terraform/modules/`.
   - Enabled secure S3 remote state tracking with DynamoDB locking.

2. **Zero-Downtime Canary Deployments (Argo Rollouts)**:
   - Configured an Argo Rollouts resource in `kubernetes/argo-rollout.yaml` that replaces standard rolling updates with metric-analysis-gated Canary traffic splits (5% → 25% → 100%).
   - Integrated a live-metrics analysis gate referencing Prometheus telemetry to track HTTP API success rates over rolling time windows, enabling automatic self-healing rollbacks on failure.

3. **Standard-Based Feature Flagging (OpenFeature SDK)**:
   - Installed and integrated `@openfeature/server-sdk` into `src/services/featureFlags.ts`.
   - Implemented an asynchronous fallback provider supporting localized in-memory presets alongside dynamic UNIX environment variable overrides (e.g. `ENABLE_CHAOS_ENGINE`).
   - Covered the implementation with clean, high-performance unit tests in `src/tests/feature-flags.test.ts`.

4. **GitHub Actions Delivery Hardening (`deploy.yml`)**:
   - Upgraded the Docker CI/CD pipeline to push build artifacts to GitHub Container Registry (GHCR) using structured tags (`sha-${SHA}`, `${{ github.ref_name }}`, and `latest` on main branches).
   - Swapped out arbitrary sleep delays in the database container initialization in favor of deterministic `--wait --wait-timeout 60` parameters.
   - Introduced a manual workflow dispatch action to trigger emergency rollbacks.

5. **Reproducible SRE Operations documentation**:
   - Rewrote `docs/deployment.md` as an exhaustive, step-by-step reproducible operations guide detailing local setups, modular Terraform applies, database migration jobs, and dynamic feature toggle configuration.

## Consequences
- All AWS resource updates must now be applied incrementally through the designated sub-modules under `terraform/modules/`.
- Deploys to EKS are managed by Argo Rollouts, giving operations teams real-time progressive-delivery control.
- Application engineers can now shield and test new modules safely using the `FeatureFlagService` toggle APIs.
