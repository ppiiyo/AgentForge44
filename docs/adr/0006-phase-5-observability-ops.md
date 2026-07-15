# ADR 0006: Phase 5 - Observability & Operations

## Status
Accepted

## Context
As the KostromAi44 (AgentForge44) orchestrator evolves into a production-grade multi-agent engine, full visibility, telemetry, incident response, and service-level objective (SLO) compliance are paramount. We require robust tools to diagnose errors, trace asynchronous workflows, track resource usage, and establish structured log validation and alert boundaries.

## Decisions
We have implemented a comprehensive production-grade telemetry and observability suite covering:

1. **OpenTelemetry Tempo/Jaeger Integration**:
   - Swapped the insecure and brittle local file-reading `/traces` endpoint in favor of the industry-standard OpenTelemetry OTLP exporter over HTTP (`@opentelemetry/exporter-trace-otlp-http`).
   - Configured traces to route directly to Tempo/Jaeger backend services via the custom `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable.

2. **Zod-Validated Log Schema & Grafana Loki**:
   - Enforced log schema structure using a strict Zod schema (`LogSchema`).
   - Added a custom Winston logger formatter `zodValidationFormat` that validates log payloads before writing to disk or terminal.
   - Built an asynchronous custom Winston `LokiTransport` that sends validated structured logs directly to Grafana Loki via standard HTTP POST queries.

3. **Domain-Specific Grafana Dashboards**:
   - Created individual production dashboard JSON definitions under `/monitoring/grafana-dashboards/` for:
     - **Pipeline Overview**: Workflow success rates and execution durations.
     - **LLM Cost & Tokens**: Track prompt/completion token consumption, API latency P95s, and estimated USD expenditure.
     - **Database Performance**: Query duration distribution and pool capacity tracking.
     - **Queue Metrics**: BullMQ job rates, queue size backlog, and job duration latencies.
     - **HTTP API Performance**: API error rates, availability status, and HTTP request latencies.

4. **SRE Alerting & SLO Compliance**:
   - Reviewed and defined alert thresholds in `/monitoring/alerts.yml` matching the exact SLO targets:
     - **99.9% Availability**: Triggers `HighAPIErrorRate` alert when HTTP 5xx errors exceed 0.1%.
     - **P95 Latency < 500ms**: Triggers `SlowAPIResponse` warning alert when P95 HTTP duration exceeds 500ms.
     - **P95 Latency < 30s**: Triggers `SlowPipelineExecutions` warning alert when P95 pipeline workflow run exceeds 30s.
     - **Error Budgets & Burn Rates**: Added SRE-standard `APIAvailabilityBudgetBurnRateHigh` multiwindow burn-rate alert (burn rate > 14.4 over 1 hour).

5. **On-Call Runbooks**:
   - Documented index and concrete mitigation guides for the top 10 potential production incident classes in `/docs/runbooks/`.

## Consequences
- The `/traces` REST endpoint has been completely removed. All distributed transaction and flow tracking must go through the unified Tempo/Jaeger tracer.
- Logs that do not fit the schema will generate format warnings, ensuring clean structure is maintained across environments.
- Operations engineers have actionable runbooks to mitigate failures in under 5 minutes.
