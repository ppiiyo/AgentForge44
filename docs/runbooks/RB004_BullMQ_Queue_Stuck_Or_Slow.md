# 🚨 Runbook RB004: BullMQ Backlog & Job Stalls

## 1. Overview
All asynchronous visual workflow runs are executed through BullMQ using Redis. If the queue is stuck, work gets backlogged (increasing wait queues) and pipeline runs are delayed.

---

## 2. Diagnostics (5 minutes)
1. **Check Prometheus Alert**:
   - Alerting rule: `QueueJobFailureRateHigh`
2. **Check Grafana Dashboard**:
   - Open `Queue Performance & BullMQ Overview`.
   - Inspect **Jobs Waiting/Delayed** card. If the backlog is growing, workers are stalled or under-provisioned.
3. **Check Logs**:
   - Filter Loki logs for: `BullMQ`, `QueueError`, or `redis connection lost`.

---

## 3. Mitigation Steps

### Action A: Restart BullMQ Workers (First Aid)
If workers are stuck in infinite loops or memory leaks:
1. Trigger a rolling restart of the queue-worker deployment pods/containers.
2. Monitor active queue jobs count using the Grafana dashboard. It should begin decreasing.

### Action B: Prune or Drain Failed/Stuck Jobs
1. If a corrupt or massive payload is causing crash-loops:
   - Connect to Redis CLI:
     ```bash
     redis-cli -u $REDIS_URL
     ```
   - Identify queue keys (typically prefixed with `bull:`) and inspect or flush stalled jobs, or use BullMQ's administrative script to drain queue.
2. Alternatively, scale up worker count to process heavy backlogs.
