# 🚨 Runbook RB002: Database Connection Pool Exhausted

## 1. Overview
This incident occurs when the active client connection count to PostgreSQL exceeds 85% of the total configured connection limit. This results in pending requests queuing and eventually timing out, causing global API failures.

---

## 2. Diagnostics (5 minutes)
1. **Check Prometheus Alert**:
   - Alerting rule: `DatabaseConnectionPoolExhausted`
2. **Check Grafana Dashboard**:
   - Go to `Database Performance` dashboard.
   - Inspect **Active Database Connections**. If it is in the RED zone, check active transaction list.
3. **Check logs**:
   - Search logs for: `TimeoutError: Pool request timeout` or `too many connections for role`.

---

## 3. Mitigation Steps

### Action A: Reclaim Zombie & Idle Connections
1. Connect directly to the database instance using psql or the CLI tool:
   ```sql
   SELECT pid, age(clock_timestamp(), query_start), char_length(query), query 
   FROM pg_stat_activity 
   WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%' 
   ORDER BY 2 DESC;
   ```
2. Terminate long-running, blocked, or hanging idle transactions:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' AND state_change < now() - interval '5 minutes';
   ```

### Action B: Scale Connection Pool
1. Increase pool configuration in your database setup or update pg-bouncer configuration.
2. In `src/db/connection.ts`, verify the Drizzle client configuration max connection limit is balanced and does not leak connections.
