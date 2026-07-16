# 📖 KostromAi44 (AgentForge44) Reproducible Production Deployment & Platform Operations

This SRE-runbook serves as the single source of truth for building, provisioning, deploying, and validating the KostromAi44 orchestrator across local development, staging, and production Kubernetes clusters.

---

## 🛠️ 1. Prerequisites & Host Validation

Before initiating any commands, ensure the following host CLI utilities are installed:
- **Docker Engine v24.x+** and **Docker Compose v2.20.x+**
- **Terraform v1.7.0+**
- **Kubectl v1.29+** (matching cluster target)
- **Helm v3.12+**
- **Argo Rollouts CLI v1.6+** (for Canary validation)

---

## ⚡ 2. Local Setup & Verification (Zero-Trust sandbox)

To run the complete platform locally with automated database migration and verification:

### Step 1: Supply Environment Configuration (`.env`)
Create a local `.env` file containing:
```env
NODE_ENV=production
PORT=3000
DB_TYPE=postgres
DATABASE_URL=postgres://kostromai44:forge_secure_pass@kostromai44-db:5432/kostromai44_db
REDIS_URL=redis://kostromai44-redis:6379
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=super_secure_random_jwt_token_key_development_32_bytes
ENCRYPTION_MASTER_KEY=bc911854ea01d2c94bb507f308a0dfce9a6b8c7d8e9f0a1b2c3d4e5f6a7b8c9d
```

### Step 2: One-Click Startup & Verification
Run the unified container orchestration cycle:
```bash
# Launch database and cache with an automated readiness loop (Wait maximum 60s)
docker compose up -d --wait --wait-timeout 60 kostromai44-db kostromai44-redis

# Trigger initial database seeding and migrations on startup
docker compose run --rm kostromai44-backend npm run db:push
docker compose run --rm kostromai44-backend npm run db:seed

# Boot the remaining web, API and worker services
docker compose up -d --build
```

Verify services status:
```bash
docker compose ps
curl -s http://localhost:3000/api/health
```

---

## 🏗️ 3. Cloud Provisioning via Modular Terraform

Our AWS infrastructure is modularized under `infra/terraform/modules/` to enforce strict isolation of responsibilities (VPC, KMS, EKS, RDS, ElastiCache Redis).

```bash
cd infra/terraform/

# Initialize and lock the secure S3 remote state
terraform init

# Validate syntactic structure
terraform validate

# Run dry-run plan
terraform plan -out=prod.tfplan

# Apply configuration with enterprise-grade isolation
terraform apply prod.tfplan
```

---

## 🚀 4. Production Kubernetes & Deployment Pipelines

### Step 1: Run Pre-Deployment Database Schema Migrations
Production deployments **must not** run migrations on application container startup. Instead, run a dedicated Kubernetes `Job` connected to the RDS database:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-schema-migration
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: migrator
        image: ghcr.io/yourorg/backend:latest
        command: ["npm", "run", "db:migrate"]
        envFrom:
        - secretRef:
            name: database-credentials
      restartPolicy: OnFailure
```
Execute the migration job:
```bash
kubectl apply -f kubernetes/db-migration-job.yaml
kubectl wait --for=condition=complete job/database-schema-migration -n production --timeout=300s
```

### Step 2: Deploy Pod Autoscale & Mesh
Verify Linkerd/Istio mTLS and apply Horizontal Pod Autoscalers:
```bash
kubectl apply -f kubernetes/hpa-and-mesh.yaml -n production
```

### Step 3: Trigger Canary Releases via Argo Rollouts
We utilize `Argo Rollouts` to manage canary deployments with metric analysis gates (5% → 25% → 100%).

Apply the declaratively structured rollout config:
```bash
kubectl apply -f kubernetes/argo-rollout.yaml -n production
```

Monitor Canary progress and live traffic splits in real-time:
```bash
kubectl argo rollouts get rollout kostromai4444-api -n production
```

In case of error rate spikes (such as a drop in the `success-rate-analysis` Prometheus check), Argo Rollouts will trigger an automatic, zero-downtime rollback to the previous safe revision.

---

## 🎛️ 5. Dynamic Configuration & Feature Flags

Feature flags are centralized via **OpenFeature Server SDK** and our custom `FeatureFlagService` which seamlessly bridges local testing overrides and production Unleash/LaunchDarkly adapters.

### Built-in Flags Checklists:
1. `enable-llm-guard`: Toggles strict regulatory filters and prompt injection sanitizers in `LLMGuard.ts`.
2. `enable-chaos-engine`: Activates on-demand database and network fault injection testing.
3. `enable-aggressive-caching`: Enables/disables real-time Redis layer content caching.
4. `sandbox-memory-limit-mb`: Controls maximum V8 container sandbox execution limits.

To override a flag locally without external servers, set its uppercase environment variable:
```bash
export ENABLE_CHAOS_ENGINE=true
export SANDBOX_MEMORY_LIMIT_MB=512
```

---

## 🔁 6. Immediate Incident Rollback Plan

If an emergency incident is declared, execute the manual trigger rollback bypass:
```bash
# Via GitHub Actions trigger:
gh workflow run deploy.yml --ref main -f action=rollback

# Or manually on EKS using kubectl:
kubectl rollout undo deployment/kostromai4444-api -n production
kubectl rollout status deployment/kostromai4444-api -n production
```
Verify the health status metrics return to normal using the SRE Grafana Dashboard.
