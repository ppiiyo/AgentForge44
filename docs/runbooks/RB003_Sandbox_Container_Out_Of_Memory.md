# 🚨 Runbook RB003: Sandbox Container Out of Memory

## 1. Overview
The platform uses Docker/V8 isolated sandboxes to execute untrusted user code (e.g. within nodes like "Creative Copywriter" or custom script run nodes). If a user script causes an infinite loop or consumes large amounts of memory, the sandbox may hit memory limits and crash with an Out-of-Memory (OOM) error.

---

## 2. Diagnostics (5 minutes)
1. **Check Prometheus Alert**:
   - Alerting rule: `ExecutorContainerDead` or high `sandbox_memory_bytes`.
2. **Check Logs**:
   - Filter Loki logs for: `OOM`, `worker exit`, `isolated-vm memory limit exceeded`, or `exit status 137`.
   - Search for: `[Sandbox Error]` or `Docker run failed`.

---

## 3. Mitigation Steps

### Action A: Adjust/Re-initialize Sandbox Memory Limits
1. Check `/src/services/sandbox/DockerSandbox.ts` or `src/utils/sandbox.ts` configurations.
2. If memory limits are set too tight (e.g. 64MB), increase them via environment variables:
   ```env
   SANDBOX_MEMORY_LIMIT=256m
   ```
3. Restart the background worker process.

### Action B: Prune Docker Sandboxes & Dangling Container Resources
If containers are hanging or leaking memory/disk:
1. SSH into the executor node.
2. Run clean up command to remove stale containers:
   ```bash
   docker ps -a --filter "status=exited" -q | xargs -r docker rm
   docker system prune -f --volumes
   ```
3. Verify available host memory climbs back to healthy levels.
