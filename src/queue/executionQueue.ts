import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { GoogleGenAI } from '@google/genai';
import { PipelineExecutor } from '../api/engine/PipelineExecutor.js';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL;
const QUEUE_NAME = 'pipeline-executions';
const DLQ_QUEUE_NAME = 'pipeline-executions-dlq';

// Concurrency tracking for memory fallback
let activeMemoryJobs = 0;
const memoryJobQueue: { runId: string; nodes: any[]; connections: any[]; variables: any; tenantId?: string; graphId?: string }[] = [];
const MAX_CONCURRENCY = 5;

let queue: Queue | null = null;
let worker: Worker | null = null;
let dlqQueue: Queue | null = null;
let redisConnection: Redis | null = null;

// Initialize BullMQ if Redis is configured
if (REDIS_URL) {
  try {
    redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });

    redisConnection.on('error', (err) => {
      logger.error(`[Queue] Redis connection error: ${err.message}`);
    });

    queue = new Queue(QUEUE_NAME, { connection: redisConnection as any });
    dlqQueue = new Queue(DLQ_QUEUE_NAME, { connection: redisConnection as any });

    worker = new Worker(QUEUE_NAME, async (job) => {
      const { runId, nodes, connections, variables, tenantId, graphId } = job.data;

      try {
        logger.info(`[Queue] Processing pipeline run asynchronously: ${runId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 1})`);
        const result = await processPipelineRun(runId, nodes, connections, variables, tenantId, graphId);
        return result;
      } catch (err: any) {
        logger.error(`[Queue] Job ${runId} failed (Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 1}): ${err.message}`);
        
        // Only route to DLQ if all retries are exhausted (prevents polluting the DLQ during intermediate retries)
        const maxAttempts = job.opts.attempts || 1;
        if (job.attemptsMade + 1 >= maxAttempts && dlqQueue) {
          logger.warn(`[Queue] Job ${runId} exhausted all ${maxAttempts} retry attempts. Route to DLQ.`);
          await dlqQueue.add('failed-job', {
            runId,
            error: err.message,
            nodes,
            connections,
            variables,
            failedAt: new Date().toISOString()
          });
        }
        throw err;
      }
    }, {
      connection: redisConnection as any,
      concurrency: MAX_CONCURRENCY,
    });

    logger.info('[Queue] BullMQ initialized successfully with Redis connection.');
  } catch (err: any) {
    logger.warn(`[Queue] Failed to init BullMQ: ${err.message}. Running in-memory fallback.`);
  }
} else {
  logger.info('[Queue] REDIS_URL not configured. Initializing memory-only fallback queue.');
}

// In-memory queue processor loop
async function processNextMemoryJob() {
  if (activeMemoryJobs >= MAX_CONCURRENCY || memoryJobQueue.length === 0) {
    return;
  }

  const job = memoryJobQueue.shift();
  if (!job) return;

  const { runId, nodes, connections, variables, tenantId, graphId } = job;

  activeMemoryJobs++;

  try {
    logger.info(`[Queue-Memory] Processing pipeline run asynchronously: ${runId}`);
    await processPipelineRun(runId, nodes, connections, variables, tenantId, graphId);
  } catch (err: any) {
    logger.error(`[Queue-Memory] Job ${runId} failed: ${err.message}`);
    // Simulate dead letter log
    logger.warn(`[Queue-Memory] Job ${runId} moved to DLQ: ${err.message}`);
  } finally {
    activeMemoryJobs--;
    setTimeout(processNextMemoryJob, 50);
  }
}

/**
 * Execute actual Pipeline via PipelineExecutor
 */
async function processPipelineRun(
  runId: string,
  nodes: any[],
  connections: any[],
  variables: any,
  tenantId?: string,
  graphId?: string
) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const executor = new PipelineExecutor(nodes, connections, ai, apiKey, runId, tenantId, graphId);
  const result = await executor.execute();
  return result;
}

/**
 * Push a new execution task to the queue
 */
export async function enqueuePipelineRun(
  runId: string,
  nodes: any[],
  connections: any[],
  variables: any = {},
  tenantId: string = 'default-workspace',
  graphId: string = 'canvas-workspace'
): Promise<void> {
  // Ensure we register the initial state in our DB as 'pending'
  try {
    const existing = await db.select().from(tables.pipelineRuns).where(eq(tables.pipelineRuns.id, runId)).limit(1);
    if (existing.length === 0) {
      await db.insert(tables.pipelineRuns).values({
        id: runId,
        graphId,
        status: 'pending',
        nodeOutputs: '{}',
        completedNodes: '[]',
        activatedNodes: '[]',
        stepCount: 0,
        executedCount: '{}',
        iterationsCount: '{}',
        logs: '[]',
        variables: JSON.stringify(variables),
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err: any) {
    logger.error(`[Queue] Failed to bootstrap db execution record for ${runId}: ${err.message}`);
  }

  if (queue) {
    try {
      // Configure exponential backoff retry policy (3 attempts, starting with a 2000ms delay)
      await queue.add(
        'execute',
        { runId, nodes, connections, variables, tenantId, graphId },
        {
          jobId: runId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      );
      logger.info(`[Queue] Job successfully added to Redis BullMQ: ${runId}`);
      return;
    } catch (err: any) {
      logger.warn(`[Queue] BullMQ push failed: ${err.message}. Falling back to memory enqueue.`);
    }
  }

  // Fallback memory queue
  memoryJobQueue.push({ runId, nodes, connections, variables, tenantId, graphId });
  logger.info(`[Queue] Job successfully added to in-memory queue: ${runId}`);
  setTimeout(processNextMemoryJob, 0);
}

/**
 * Gracefully close active queue and worker connections on process termination
 */
export async function closeQueueSystem(): Promise<void> {
  logger.info('[Queue] Shutting down queue systems gracefully...');
  if (worker) {
    await worker.close();
    logger.info('[Queue] BullMQ Worker closed.');
  }
  if (queue) {
    await queue.close();
    logger.info('[Queue] BullMQ Queue closed.');
  }
  if (dlqQueue) {
    await dlqQueue.close();
    logger.info('[Queue] BullMQ DLQ Queue closed.');
  }
  if (redisConnection) {
    try {
      await redisConnection.quit();
      logger.info('[Queue] Redis connection closed.');
    } catch (err: any) {
      logger.error(`[Queue] Error closing Redis connection: ${err.message}`);
    }
  }
}
