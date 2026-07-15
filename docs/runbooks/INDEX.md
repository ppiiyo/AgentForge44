# 📖 KostromAi44 On-Call Runbooks Index

Welcome to the KostromAi44 On-Call Runbooks directory. This directory contains production incident-response runbooks for SREs and Engineers on call.

---

## 🚨 Incident Triage Quick Reference

| Class ID | Incident Class | Alert Reference | Criticality | Primary Mitigation |
|---|---|---|---|---|
| **RB001** | LLM API Quota / Rate Limit | `llm_calls_total` | High | Fall back to simulator or secondary provider |
| **RB002** | Database Connection Exhausted | `DatabaseConnectionPoolExhausted` | Critical | Force disconnect idle/zombie transactions |
| **RB003** | Sandbox Container Out of Memory | `sandbox_memory_bytes` | High | Re-initialize executor, adjust sandbox memory limits |
| **RB004** | BullMQ Backlog / Worker Stalls | `QueueJobFailureRateHigh` | Critical | Restart worker instances, drain dead letter queues |
| **RB005** | HTTP API P95 Latency SLO Violation | `SlowAPIResponse` | Medium | Enable aggressive Redis caching, profile endpoints |
| **RB006** | JWT Verification / Rotation Faults| `APIAvailabilityBudgetBurnRateHigh` | High | Deploy emergency fallback key, reset primary secrets |
| **RB007** | Prompt Injection Storm Blockages | `HighAPIErrorRate` (User Block) | Medium | Adjust LLMGuard blocklist strictness thresholds |
| **RB008** | Webhook / SSRF Request Blockages | `http_requests_total` failure | Medium | Allow list custom private IPs in SSRF validator config |
| **RB009** | Socket.io Socket / Memory Leak | `sandbox_memory_bytes` | High | Force garbage collection, recycle ws node processes |
| **RB010** | Host Disk Exhaustion via Log Rotation | Disk usage alerts | High | Truncate `logs/combined.log`, trigger Winston rotators |

---

## 🛠 Active Runbooks

To view a detailed runbook, refer to the corresponding files:

- **[RB001: LLM API Quota Exhausted](./RB001_LLM_API_Quota_Exhausted.md)**
- **[RB002: DB Connection Pool Exhausted](./RB002_Database_Connection_Pool_Exhausted.md)**
- **[RB003: Sandbox Container Out-Of-Memory](./RB003_Sandbox_Container_Out_Of_Memory.md)**
- **[RB004: BullMQ Backlog & Job Stalls](./RB004_BullMQ_Queue_Stuck_Or_Slow.md)**

---

## 📈 Standard Incident Command Protocol
1. **Declare**: Open an incident bridge and assign an Incident Commander (IC).
2. **Isolate**: Apply primary mitigation (e.g., fallback mode, container restart) to stop the immediate bleed.
3. **Verify**: Use Grafana Dashboards to verify error rates return to normal.
4. **Debrief**: Open a post-mortem issue within 24 hours.
