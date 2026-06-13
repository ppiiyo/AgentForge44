import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { MetricsCollector, VersionManager } from '../../api/metricsAndVersions.js';

describe('Metrics and Versions API Suite', () => {
  const DATA_DIR = path.join(process.cwd(), 'projects', '.metadata');
  const METRICS_FILE = path.join(DATA_DIR, 'metrics_executions.json');
  const VERSIONS_FILE = path.join(DATA_DIR, 'graph_versions.json');

  let originalMetrics: string | null = null;
  let originalVersions: string | null = null;

  beforeEach(() => {
    if (fs.existsSync(METRICS_FILE)) {
      originalMetrics = fs.readFileSync(METRICS_FILE, 'utf-8');
      fs.unlinkSync(METRICS_FILE);
    }
    if (fs.existsSync(VERSIONS_FILE)) {
      originalVersions = fs.readFileSync(VERSIONS_FILE, 'utf-8');
      fs.unlinkSync(VERSIONS_FILE);
    }
  });

  afterEach(() => {
    if (originalMetrics !== null) {
      fs.writeFileSync(METRICS_FILE, originalMetrics, 'utf-8');
    } else if (fs.existsSync(METRICS_FILE)) {
      fs.unlinkSync(METRICS_FILE);
    }

    if (originalVersions !== null) {
      fs.writeFileSync(VERSIONS_FILE, originalVersions, 'utf-8');
    } else if (fs.existsSync(VERSIONS_FILE)) {
      fs.unlinkSync(VERSIONS_FILE);
    }
  });

  describe('MetricsCollector', () => {
    it('should correctly estimate tokens', () => {
      expect(MetricsCollector.estimateTokens('')).toBe(0);
      expect(MetricsCollector.estimateTokens('abcd')).toBe(1);
      expect(MetricsCollector.estimateTokens('abcdefgh')).toBe(2);
    });

    it('should calculate cost accurately for each node type', () => {
      const longInput = 'a'.repeat(100000); // 25,000 tokens
      const longOutput = 'b'.repeat(100000); // 25,000 tokens

      // gemini
      const geminiResult = MetricsCollector.calculateNodeCost('gemini', longInput, longOutput);
      expect(geminiResult.tokens).toBe(50000);
      expect(geminiResult.cost).toBeGreaterThan(0);

      // reviewer
      const reviewerResult = MetricsCollector.calculateNodeCost('reviewer', longInput, longOutput);
      expect(reviewerResult.tokens).toBe(50000);
      expect(reviewerResult.cost).toBeGreaterThan(0);

      // local operations
      const localResult = MetricsCollector.calculateNodeCost('prompt', longInput, longOutput);
      expect(localResult.tokens).toBe(0);
      expect(localResult.cost).toBe(0);

      // other / general
      const generalResult = MetricsCollector.calculateNodeCost('openai', longInput, longOutput);
      expect(generalResult.tokens).toBe(50000);
      expect(generalResult.cost).toBeGreaterThan(0);
    });

    it('should log execution telemetry successful status', async () => {
      const logs = [
        { nodeId: 'gemini-agent-123', input: 'input data', output: 'output content', duration: 150 }
      ];
      const logObj = await MetricsCollector.logExecution(
        'test-graph',
        'Test Graph Name',
        'success',
        Date.now() - 200,
        logs
      );

      expect(logObj.graphId).toBe('test-graph');
      expect(logObj.status).toBe('success');
      expect(logObj.nodeExecutions.length).toBe(1);
      expect(logObj.nodeExecutions[0].tokensUsed).toBeGreaterThan(0);
      expect(fs.existsSync(METRICS_FILE)).toBe(true);
    });

    it('should log failure execution status with error message', async () => {
      const logs = [
        { nodeId: 'reviewer-eval-123', input: 'test prompt', output: 'failure error debug', duration: 80 }
      ];
      const logObj = await MetricsCollector.logExecution(
        'test-graph-fail',
        'Failed Test Graph',
        'failed',
        Date.now() - 100,
        logs,
        'Simulated Engine Defect'
      );

      expect(logObj.graphId).toBe('test-graph-fail');
      expect(logObj.status).toBe('failed');
      expect(logObj.errorMessage).toBe('Simulated Engine Defect');
    });

    it('should aggregate summary and metrics properly', async () => {
      const longInput = 'a'.repeat(100000);
      const longOutput = 'b'.repeat(100000);

      const logsSuccess = [{ nodeId: 'gemini-123', input: longInput, output: longOutput, duration: 100 }];
      const logsFail = [{ nodeId: 'openai-123', input: longInput, output: longOutput, duration: 50 }];

      await MetricsCollector.logExecution('g-1', 'Graph 1', 'success', Date.now() - 150, logsSuccess);
      await MetricsCollector.logExecution('g-1', 'Graph 1', 'failed', Date.now() - 100, logsFail, 'test error');

      const summary = MetricsCollector.getSummary(7);
      expect(summary.totalRuns).toBe(2);
      expect(summary.successRate).toBe(50.0);
      expect(summary.totalCostUsd).toBeGreaterThan(0);
      expect(summary.daily.length).toBe(7);

      const filterByGraph = MetricsCollector.getExecutionsByGraph('g-1');
      expect(filterByGraph.length).toBe(2);

      const breakdown = MetricsCollector.getCostBreakdown();
      expect(breakdown.length).toBe(3);
      expect(breakdown.find(b => b.name === 'Gemini Agent Node').cost).toBeGreaterThan(0);
    });
  });

  describe('VersionManager', () => {
    const testGraphId = 'version-test-graph';
    const snapshotV1 = {
      name: 'V1 Graph',
      nodes: [
        { id: 'n1', type: 'input', title: 'Input Node', x: 0, y: 0, fields: {} }
      ],
      connections: []
    };

    const snapshotV2 = {
      name: 'V2 Graph',
      nodes: [
        { id: 'n1', type: 'input', title: 'Input Node', x: 0, y: 0, fields: { key: 'updated' } },
        { id: 'n2', type: 'gemini', title: 'Gemini Node', x: 10, y: 10, fields: {} }
      ],
      connections: [
        { id: 'c1', sourceId: 'n1', targetId: 'n2' }
      ]
    };

    it('should successfully commit and track version increments', () => {
      const v1 = VersionManager.commit(testGraphId, 'Initial creation', 'Author Dev', snapshotV1);
      expect(v1.versionNumber).toBe(1);
      expect(v1.diffSummary).toBe('Initial workspace version');
      expect(v1.commitMessage).toBe('Initial creation');

      const v2 = VersionManager.commit(testGraphId, 'Feature additions', 'Author Dev', snapshotV2);
      expect(v2.versionNumber).toBe(2);
      // Diff shows Added: 1 (n2), Removed: 0, Edited: 1 (n1 fields changed)
      expect(v2.diffSummary).toContain('Added: 1');
      expect(v2.diffSummary).toContain('Removed: 0');
      expect(v2.diffSummary).toContain('Edited: 1');

      const list = VersionManager.getVersions(testGraphId);
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(v2.id); // sorted desc
    });

    it('should compute granular node differences between version snapshots', () => {
      const v1 = VersionManager.commit(testGraphId, 'First version', 'Dev', snapshotV1);
      const v2 = VersionManager.commit(testGraphId, 'Second version', 'Dev', snapshotV2);

      const diff = VersionManager.computeDiff(v1.id, v2.id);
      expect(diff.addedIds).toEqual(['n2']);
      expect(diff.deletedIds).toEqual([]);
      expect(diff.modifiedIds).toEqual(['n1']);
    });

    it('should rollback workflow projects files', () => {
      const v1 = VersionManager.commit(testGraphId, 'First commit', 'Dev', snapshotV1);
      const restored = VersionManager.rollback(testGraphId, v1.id);

      expect(restored.id).toBe(v1.id);
      const filePath = path.join(process.cwd(), 'projects', `${testGraphId}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      const raw = fs.readFileSync(filePath, 'utf-8');
      const content = JSON.parse(raw);
      expect(content.name).toBe('V1 Graph');

      // delete rollback projects file to keep directory clean
      fs.unlinkSync(filePath);
    });

    it('should throw an error on rollbacks to missing versionIds', () => {
      expect(() => {
        VersionManager.rollback(testGraphId, 'ver_non_existing_9999');
      }).toThrow();
    });
  });
});
