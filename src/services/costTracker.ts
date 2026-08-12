import { adapter } from '../db/index.js';
import * as sqliteSchema from '../db/schema.js';
import * as pgSchema from '../db/postgres-schema.js';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { LLM_PRICING } from '../config/pricing.js';

export async function trackLLMCost(
  graphId: string | null,
  runId: string | null,
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  tenantId = 'default-workspace'
): Promise<number> {
  const normProvider = provider.toLowerCase();
  const normModel = model.toLowerCase();

  const costPer1K = LLM_PRICING[normProvider]?.[normModel] ?? 0.001;
  const totalTokens = promptTokens + completionTokens;
  const costUsd = (totalTokens / 1000) * costPer1K;

  const db = adapter.db;
  const isPostgres = adapter.type === 'postgres';
  const table = isPostgres ? pgSchema.llmUsage : sqliteSchema.llmUsage;

  const record = {
    id: crypto.randomUUID(),
    graphId: graphId ?? null,
    runId: runId ?? null,
    provider,
    model,
    promptTokens,
    completionTokens,
    costUsd,
    tenantId,
    createdAt: new Date().toISOString(),
  };

  try {
    await db.insert(table).values(record);
    logger.info(`Recorded LLM usage cost: $${costUsd.toFixed(6)} (${provider}/${model})`);
  } catch (err: any) {
    logger.warn('Non-fatal error inserting llm_usage cost record:', err.message || err);
  }

  return costUsd;
}

export async function getLLMUsageSummary(graphId?: string, tenantId = 'default-workspace') {
  const db = adapter.db;
  const isPostgres = adapter.type === 'postgres';
  const table = isPostgres ? pgSchema.llmUsage : sqliteSchema.llmUsage;

  try {
    const query = db.select().from(table);
    const records = await query;

    const filtered = records.filter((r: any) => {
      const tenantMatch = !r.tenantId || r.tenantId === tenantId;
      const graphMatch = !graphId || r.graphId === graphId;
      return tenantMatch && graphMatch;
    });

    const totalCostUsd = filtered.reduce((acc: number, r: any) => acc + (r.costUsd || 0), 0);
    const totalPromptTokens = filtered.reduce((acc: number, r: any) => acc + (r.promptTokens || 0), 0);
    const totalCompletionTokens = filtered.reduce((acc: number, r: any) => acc + (r.completionTokens || 0), 0);

    return {
      totalCostUsd,
      totalPromptTokens,
      totalCompletionTokens,
      totalCalls: filtered.length,
      records: filtered.slice(0, 100),
    };
  } catch (err: any) {
    logger.warn('Failed to fetch LLM usage summary:', err.message || err);
    return { totalCostUsd: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalCalls: 0, records: [] };
  }
}
