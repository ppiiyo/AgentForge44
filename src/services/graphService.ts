import { db, tables } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export async function saveGraphVersion(graphId: string, author = 'system', commitMessage = 'Auto-saved version') {
  const currentGraphs = await db.select().from(tables.graphs).where(eq(tables.graphs.id, graphId));
  if (!currentGraphs.length) {
    throw new Error(`Graph with ID "${graphId}" not found.`);
  }

  const currentGraph = currentGraphs[0];
  const nextVersion = (currentGraph.version || 1) + 1;

  // 1. Update existing graph version count
  await db
    .update(tables.graphs)
    .set({ version: nextVersion })
    .where(eq(tables.graphs.id, graphId));

  // 2. Insert a new record in the versions table
  const versionRecord = {
    id: crypto.randomUUID(),
    graphId,
    versionNumber: nextVersion,
    author,
    commitMessage,
    diffSummary: `Incremental update to version ${nextVersion}`,
    snapshot: JSON.stringify({
      nodes: typeof currentGraph.nodes === 'string' ? JSON.parse(currentGraph.nodes) : currentGraph.nodes,
      connections: typeof currentGraph.connections === 'string' ? JSON.parse(currentGraph.connections) : currentGraph.connections,
    }),
    tenantId: currentGraph.tenantId || 'default-workspace',
    createdAt: new Date().toISOString(),
  };

  await db.insert(tables.versions).values(versionRecord);
  logger.info(`Saved graph version ${nextVersion} for graph "${graphId}"`);

  return {
    graphId,
    versionNumber: nextVersion,
    versionRecord,
  };
}

export async function restoreGraphVersion(graphId: string, versionNumber: number) {
  const versionRecords = await db
    .select()
    .from(tables.versions)
    .where(and(eq(tables.versions.graphId, graphId), eq(tables.versions.versionNumber, versionNumber)));

  if (!versionRecords.length) {
    throw new Error(`Version ${versionNumber} for graph "${graphId}" not found.`);
  }

  const targetVersion = versionRecords[0];
  const snapshot = typeof targetVersion.snapshot === 'string' ? JSON.parse(targetVersion.snapshot) : targetVersion.snapshot;

  await db
    .update(tables.graphs)
    .set({
      nodes: JSON.stringify(snapshot.nodes || []),
      connections: JSON.stringify(snapshot.connections || []),
    })
    .where(eq(tables.graphs.id, graphId));

  logger.info(`Restored graph "${graphId}" to version ${versionNumber}`);

  return {
    graphId,
    restoredVersion: versionNumber,
    nodes: snapshot.nodes || [],
    connections: snapshot.connections || [],
  };
}
