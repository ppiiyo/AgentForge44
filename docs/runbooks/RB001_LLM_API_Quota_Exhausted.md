# 🚨 Runbook RB001: LLM API Quota Exhausted / Rate Limit Exceeded

## 1. Overview
The platform relies heavily on LLM providers (mainly Google Gemini via `@google/genai`). If keys expire, run out of funds, or get rate limited, workflow runs will start failing globally with `INVALID_ARGUMENT` or `RESOURCE_EXHAUSTED` (HTTP 429).

---

## 2. Diagnostics (5 minutes)
1. **Check Grafana Dashboard**:
   - Navigate to `LLM Cost & Token Overview` dashboard.
   - Inspect the **LLM Call Success Rate** stat. If it has dipped below 95%, investigate immediately.
2. **Review Loki logs**:
   - Filter Loki logs for level `error` or search for `[AUTHENTICATION_ERROR]` or `RESOURCE_EXHAUSTED`.
   - Command: `level=error |~ "LLM request failed"`
3. **Check current environment variables**:
   - Ensure `GEMINI_API_KEY` is set and valid.

---

## 3. Mitigation Steps

### Action A: Enable API Simulation Fallback (Immediate Relief)
If there is an emergency and no new keys are available, you can force the application into simulation/mock mode for test runs:
1. Open the platform deployment's environment settings.
2. Set the API key to our simulation testing placeholder:
   ```env
   GEMINI_API_KEY=sandbox_free_test_gemini
   ```
3. Restart the dev/production server. This forces Gemini requests to execute locally via simulated model engines without network failure.

### Action B: Rotate LLM API Keys (Permanent Fix)
1. Request a new API key from Google AI Studio.
2. Add/replace the key in the production `.env` config:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. Perform a rolling restart of the container instances.
4. Verify using the Grafana dashboard that the **LLM Call Success Rate** climbs back to 100%.
