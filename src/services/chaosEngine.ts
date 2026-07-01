import { logger } from './logger.js';

export interface ChaosConfig {
  dbFailureActive: boolean;
  dbLatencyMs: number;
  llmFailureActive: Record<string, boolean>; // provider -> failure status
  llmLatencyMs: Record<string, number>;      // provider -> latency in ms
  nodeHangActive: Record<string, boolean>;   // nodeId -> hang status
  nodeHangMs: Record<string, number>;        // nodeId -> hang time
}

class ChaosEngine {
  private config: ChaosConfig = {
    dbFailureActive: false,
    dbLatencyMs: 0,
    llmFailureActive: {},
    llmLatencyMs: {},
    nodeHangActive: {},
    nodeHangMs: {},
  };

  getConfig(): ChaosConfig {
    return this.config;
  }

  updateConfig(newConfig: Partial<ChaosConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      llmFailureActive: { ...this.config.llmFailureActive, ...(newConfig.llmFailureActive || {}) },
      llmLatencyMs: { ...this.config.llmLatencyMs, ...(newConfig.llmLatencyMs || {}) },
      nodeHangActive: { ...this.config.nodeHangActive, ...(newConfig.nodeHangActive || {}) },
      nodeHangMs: { ...this.config.nodeHangMs, ...(newConfig.nodeHangMs || {}) },
    };
    logger.warn('[ChaosEngine] Configuration updated:', JSON.stringify(this.config));
  }

  reset() {
    this.config = {
      dbFailureActive: false,
      dbLatencyMs: 0,
      llmFailureActive: {},
      llmLatencyMs: {},
      nodeHangActive: {},
      nodeHangMs: {},
    };
    logger.info('[ChaosEngine] Reset completed.');
  }

  async simulateDbAccess(): Promise<void> {
    if (this.config.dbFailureActive) {
      logger.error('[ChaosEngine] DB Failure Triggered!');
      throw new Error('ChaosEngine: Simulated database connection outage.');
    }
    if (this.config.dbLatencyMs > 0) {
      logger.info(`[ChaosEngine] Injecting ${this.config.dbLatencyMs}ms database latency...`);
      await new Promise(resolve => setTimeout(resolve, this.config.dbLatencyMs));
    }
  }

  async checkLlmChaos(providerName: string): Promise<void> {
    const cleanProviderName = providerName.split(' ')[0]; // E.g. "Gemini" from "Gemini (gemini-3.5-flash)"
    const failureActive = this.config.llmFailureActive[cleanProviderName] || this.config.llmFailureActive['all'];
    
    if (failureActive) {
      logger.error(`[ChaosEngine] Forced LLM failure for provider: ${cleanProviderName}`);
      throw new Error(`ChaosEngine: Simulated provider failure for ${cleanProviderName}`);
    }

    const latency = this.config.llmLatencyMs[cleanProviderName] || this.config.llmLatencyMs['all'] || 0;
    if (latency > 0) {
      logger.info(`[ChaosEngine] Injecting ${latency}ms latency for LLM provider: ${cleanProviderName}`);
      await new Promise(resolve => setTimeout(resolve, latency));
    }
  }

  async checkNodeChaos(nodeId: string, nodeTitle: string): Promise<void> {
    if (this.config.nodeHangActive[nodeId] || this.config.nodeHangActive['all']) {
      const ms = this.config.nodeHangMs[nodeId] || this.config.nodeHangMs['all'] || 5000;
      logger.warn(`[ChaosEngine] Hanging node ${nodeTitle} (${nodeId}) for ${ms}ms...`);
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }
}

export const chaosEngine = new ChaosEngine();
