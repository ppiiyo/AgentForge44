import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { PipelineExecutor } from '../services/pipeline/PipelineExecutor.js';
import { chaosEngine } from '../services/chaosEngine.js';
import { circuitBreakerRegistry, CircuitState } from '../services/circuitBreaker.js';
import { GeminiProvider } from '../api/providers.js';
import { GoogleGenAI } from '@google/genai';
import { db, tables, adapter } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { runSchemaMigrations } from '../api/migrate.js';

// Mock GoogleGenAI models.generateContent to make direct calls predictable
const generateContentMock = vi.fn();
vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = {
      generateContent: generateContentMock
    };
  }
  return { GoogleGenAI };
});

describe('KostromAi44 Comprehensive Resilience & Chaos Engineering Suite', () => {
  const ai = new GoogleGenAI({ apiKey: 'sandbox_test_key' });

  beforeAll(async () => {
    try {
      await runSchemaMigrations(adapter);
    } catch {}
  });

  beforeEach(() => {
    chaosEngine.reset();
    generateContentMock.mockReset();
    generateContentMock.mockResolvedValue({
      text: "Processed prompt text successfully from mock GoogleGenAI.",
      candidates: [{
        content: {
          parts: [{ text: "Processed prompt text successfully from mock GoogleGenAI." }]
        }
      }]
    });
    
    // Reset circuit breakers to CLOSED
    for (const b of circuitBreakerRegistry.getAllBreakers()) {
      (b as any).reset();
      (b as any).state = CircuitState.CLOSED;
    }
  });

  afterEach(() => {
    chaosEngine.reset();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // 1. Pipeline Execution with Sandbox Mock LLM
  // -------------------------------------------------------------
  it('should run a topological pipeline executor successfully in sandbox/simulated mode', async () => {
    const nodes: any[] = [
      {
        id: 'node-1',
        type: 'input',
        title: 'Input Node',
        fields: { variables: [{ key: 'task', value: 'resilience test' }] }
      },
      {
        id: 'node-2',
        type: 'prompt',
        title: 'Prompt Node',
        fields: { template: 'Execute: {task}' }
      },
      {
        id: 'node-3',
        type: 'gemini',
        title: 'Gemini Node',
        fields: { model: 'gemini-3.5-flash' }
      },
      {
        id: 'node-4',
        type: 'output',
        title: 'Output Node',
        fields: { value: '' }
      }
    ];

    const connections: any[] = [
      { id: 'c1', sourceId: 'node-1', targetId: 'node-2' },
      { id: 'c2', sourceId: 'node-2', targetId: 'node-3' },
      { id: 'c3', sourceId: 'node-3', targetId: 'node-4' }
    ];

    const executor = new PipelineExecutor(nodes, connections, ai, { model: 'gemini-3.5-flash' });
    const result = await executor.execute();

    expect(result.finalResult).toBeDefined();
    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.logs.every(log => log.status === 'completed')).toBe(true);
  });

  // -------------------------------------------------------------
  // 2. Chaos Engineering: Database Outage & Latency Simulation
  // -------------------------------------------------------------
  it('should inject DB latency and crash when DB Outage is active under Chaos Engineering', async () => {
    // A. Inject DB Latency
    chaosEngine.updateConfig({ dbLatencyMs: 20 });
    const start = Date.now();
    
    // Perform standard db select
    await db.select().from(tables.projects).where(eq(tables.projects.id, 'non-existent-id'));
    const duration = Date.now() - start;
    
    expect(duration).toBeGreaterThanOrEqual(15); // should take at least ~20ms

    // B. Inject DB Outage / Failure
    chaosEngine.updateConfig({ dbFailureActive: true });
    
    expect(() => {
      db.select().from(tables.projects);
    }).toThrow('ChaosEngine: Simulated database connection outage.');

    // Reset chaos
    chaosEngine.reset();
    const healthyCheck = await db.select().from(tables.projects).where(eq(tables.projects.id, 'non-existent-id'));
    expect(healthyCheck).toBeDefined();
  });

  // -------------------------------------------------------------
  // 3. Chaos Engineering & Circuit Breaker: LLM Outage
  // -------------------------------------------------------------
  it('should trip the Gemini Circuit Breaker when Quota or Provider outages are simulated', async () => {
    const provider = new GeminiProvider('real_production_key_testing', 'gemini-3.5-flash');
    const breaker = circuitBreakerRegistry.getBreaker(provider.getName());
    
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Turn on Chaos Engineering simulated provider outage for Gemini
    chaosEngine.updateConfig({
      llmFailureActive: { Gemini: true }
    });

    // Make calls to fail and trip breaker (threshold: 3)
    let call1Err, call2Err, call3Err;
    try { await provider.generate('prompt 1'); } catch (e) { call1Err = e; }
    try { await provider.generate('prompt 2'); } catch (e) { call2Err = e; }
    try { await provider.generate('prompt 3'); } catch (e) { call3Err = e; }

    expect(call1Err).toBeDefined();
    expect(call2Err).toBeDefined();
    expect(call3Err).toBeDefined();

    // Circuit Breaker must be OPEN now!
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Call 4 must immediately fail with Circuit Breaker is OPEN error without evaluating LLM
    let fastFailureErr: any;
    try {
      await provider.generate('prompt 4');
    } catch (e) {
      fastFailureErr = e;
    }

    expect(fastFailureErr).toBeDefined();
    expect(fastFailureErr.message).toContain('Circuit breaker Gemini is OPEN');

    // Turn off Chaos failure, reset breaker, and check recovery
    chaosEngine.reset();
    (breaker as any).reset();
    (breaker as any).state = CircuitState.CLOSED;

    // Standard sandbox/mock return should work now
    process.env.DEMO_MODE = 'true';
    const recoveredResponse = await provider.generate('healthy prompt');
    expect(recoveredResponse.text).toContain('Processed prompt text successfully');
  });

  // -------------------------------------------------------------
  // 4. Chaos Engineering: Pipeline Node Hanging Simulation
  // -------------------------------------------------------------
  it('should inject node-level hangs correctly during Pipeline Executor runs', async () => {
    const nodes: any[] = [
      { id: 'input-node', type: 'input', title: 'Input', fields: { variables: [] } },
      { id: 'output-node', type: 'output', title: 'Output', fields: { value: '' } }
    ];
    const connections: any[] = [
      { id: 'c1', sourceId: 'input-node', targetId: 'output-node' }
    ];

    // Configure node output-node to hang for 30ms
    chaosEngine.updateConfig({
      nodeHangActive: { 'output-node': true },
      nodeHangMs: { 'output-node': 30 }
    });

    const executor = new PipelineExecutor(nodes, connections, ai);
    const start = Date.now();
    await executor.execute();
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThanOrEqual(25); // Should have taken at least 30ms due to hang
  });

  // -------------------------------------------------------------
  // 5. Runtime Self-Healing: Auto-recovery on node crash
  // -------------------------------------------------------------
  it('should trigger runtime self-healing when a node fails, recovering successfully', async () => {
    const nodes: any[] = [
      { id: 'input-node', type: 'input', title: 'Input', fields: { variables: [] } },
      { id: 'gemini-node', type: 'gemini', title: 'Gemini Generation', fields: { model: 'gemini-3.5-flash' } },
      { id: 'output-node', type: 'output', title: 'Output', fields: { value: '' } }
    ];
    const connections: any[] = [
      { id: 'c1', sourceId: 'input-node', targetId: 'gemini-node' },
      { id: 'c2', sourceId: 'gemini-node', targetId: 'output-node' }
    ];

    // Force failure on the gemini-node using ChaosEngine
    chaosEngine.updateConfig({
      llmFailureActive: { Gemini: true }
    });

    const executor = new PipelineExecutor(nodes, connections, ai);
    const result = await executor.execute();

    // Reset chaos
    chaosEngine.reset();

    const hasHealedContent = result.finalResult.includes('Automatically recovered from failure state') || result.finalResult.includes('Simulated LLM Output');
    expect(hasHealedContent).toBe(true);
    const healingLog = result.logs.find(l => l.nodeId === 'gemini-node');
    expect(healingLog).toBeDefined();
    const hasCorrectHealingLogInput = healingLog?.input.includes('Self-Healing Recovery') || healingLog?.input.includes('Self-Healing Automated Recovery');
    expect(hasCorrectHealingLogInput).toBe(true);
  });
});
