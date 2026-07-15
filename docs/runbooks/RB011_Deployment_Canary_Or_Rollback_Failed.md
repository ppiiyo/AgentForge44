# 🚨 Runbook RB011: Deployment Canary Blocked / Rollback Fault

## 1. Overview
The platform utilizes Argo Rollouts with Prometheus-driven metric analysis gates for automated Canary progressive delivery. If the Canary analysis fails to resolve, or if a rollout becomes stuck, deployments will pause, blocking further continuous delivery (CD) updates.

---

## 2. Diagnostics (5 minutes)
1. **Check Rollout Status via CLI**:
   - Inspect the current step, weight, and failure conditions:
     ```bash
     kubectl argo rollouts get rollout kostromai4444-api -n production
     ```
2. **Review Prometheus Metrics**:
   - Verify if the `success-rate-analysis` Prometheus query is returning data and check if there are transient network splits between EKS and Prometheus:
     ```bash
     kubectl logs deployment/argo-rollouts -n argo-rollouts
     ```
3. **Inspect Application Pods**:
   - Ensure the Canary containers aren't crash-looping due to missing configurations or secrets:
     ```bash
     kubectl get pods -n production -l app=kostromai4444-api
     kubectl logs -n production -l app=kostromai4444-api -c api --tail=100
     ```

---

## 3. Mitigation Steps

### Action A: Manual Canary Override / Promotion (Promote)
If the analysis failed due to a misconfigured Prometheus check or transient infra outage, but the new code version is confirmed to be healthy:
1. Promote the rollout manually to resume advancing traffic weights directly to 100%:
   ```bash
   kubectl argo rollouts promote kostromai4444-api -n production
   ```

### Action B: Trigger Immediate Rolling Rollback
If the Canary has high error rates and must be immediately reverted back to stable:
1. Abort the current rollout and execute a manual undo step:
   ```bash
   kubectl argo rollouts abort kostromai4444-api -n production
   kubectl rollout undo deployment/kostromai4444-api -n production
   ```
2. Verify rollout status resolves back to fully stable:
   ```bash
   kubectl rollout status deployment/kostromai4444-api -n production
   ```
