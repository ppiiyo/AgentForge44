import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { executePipeline } from '../api/agentRun.js';
import { logger } from '../utils/logger.js';
import { triggerWebhook } from '../webhooks/index.js';

export interface Schedule {
  id: string;
  graphId: string;
  graphName: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  stats: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
  };
}

const schedules = new Map<string, { task: any; config: Schedule }>();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

export function createSchedule(graphId: string, cronExpression: string, graphName?: string): Schedule {
  if (!cron.validate(cronExpression)) {
    throw new Error('Invalid cron expression');
  }

  const id = `schedule_${Date.now()}`;
  const normalizedGraphName = graphName || graphId;
  const config: Schedule = {
    id,
    graphId,
    graphName: normalizedGraphName,
    cronExpression,
    enabled: true,
    stats: { totalRuns: 0, successRuns: 0, failedRuns: 0 }
  };

  const task = cron.schedule(cronExpression, async () => {
    logger.info(`Executing scheduled graph: ${graphId} (${normalizedGraphName})`);
    config.stats.totalRuns++;
    config.lastRun = new Date();

    const filePath = path.join(PROJECTS_DIR, `${graphId}.json`);
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Graph file for schema ${graphId} not found on server.`);
      }

      const raw = await fsPromises.readFile(filePath, 'utf-8');
      const content = JSON.parse(raw);
      const nodes = content.nodes || [];
      const connections = content.connections || [];

      // Trigger Webhook graph.started
      await triggerWebhook('graph.started', {
        scheduleId: id,
        graphId,
        graphName: normalizedGraphName,
        timestamp: new Date()
      });

      logger.info(`Running pipeline execution for scheduled graph: ${graphId}`);
      const result = await executePipeline(nodes, connections);
      config.stats.successRuns++;

      // Trigger Webhook graph.completed
      await triggerWebhook('graph.completed', {
        scheduleId: id,
        graphId,
        graphName: normalizedGraphName,
        result,
        timestamp: new Date()
      });

    } catch (error: any) {
      config.stats.failedRuns++;
      logger.error(`Scheduled execution of graph ${graphId} failed: ${error.message}`);
      
      // Trigger Webhook graph.failed
      await triggerWebhook('graph.failed', {
        scheduleId: id,
        graphId,
        graphName: normalizedGraphName,
        error: error.message || String(error),
        timestamp: new Date()
      });
    }
  });

  schedules.set(id, { task, config });
  return config;
}

export function deleteSchedule(id: string) {
  const schedule = schedules.get(id);
  if (schedule) {
    schedule.task.stop();
    schedules.delete(id);
  }
}

export function toggleSchedule(id: string, enabled: boolean): Schedule | undefined {
  const item = schedules.get(id);
  if (!item) return undefined;

  if (enabled) {
    item.task.start();
  } else {
    item.task.stop();
  }
  item.config.enabled = enabled;
  return item.config;
}

export function listSchedules(): Schedule[] {
  return Array.from(schedules.values()).map(s => s.config);
}
