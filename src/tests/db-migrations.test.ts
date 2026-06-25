import { describe, it, expect } from 'vitest';
import { db, tables, adapter } from '../db/index.js';
import { runSchemaMigrations } from '../api/migrate.js';
import { eq } from 'drizzle-orm';

describe('=== Task 2.1: DB Schema, Programmatic Migrations, and Cascade Deletes ===', () => {

  it('should run schema migrations programmatically and ensure they are idempotent', async () => {
    // 1. Run migrations
    await expect(runSchemaMigrations(adapter)).resolves.not.toThrow();

    // 2. Ensure default-workspace is seeded successfully
    const workspacesList = await db.select().from(tables.workspaces).where(eq(tables.workspaces.id, 'default-workspace')).limit(1);
    expect(workspacesList.length).toBe(1);
    expect(workspacesList[0].id).toBe('default-workspace');
    expect(workspacesList[0].name).toBe('Default Workspace');

    // 3. Re-running migrations should be safe and idempotent
    await expect(runSchemaMigrations(adapter)).resolves.not.toThrow();
  });

  it('should enforce graphs.projectId -> projects.id ON DELETE CASCADE foreign key constraint', async () => {
    // Create unique IDs to prevent collision
    const testProjectId = `proj_cascade_${Date.now()}`;
    const testGraphId = `graph_cascade_${Date.now()}`;

    // 1. Insert a workspace first if needed (should already be there)
    const wsId = 'default-workspace';

    // 2. Insert test project
    await db.insert(tables.projects).values({
      id: testProjectId,
      name: 'Test Project Cascade',
      userId: 'test_user',
      tenantId: wsId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 3. Insert test graph linked to that project
    await db.insert(tables.graphs).values({
      id: testGraphId,
      projectId: testProjectId,
      name: 'Test Graph Cascade',
      nodes: '[]',
      connections: '[]',
      tenantId: wsId,
      createdAt: new Date().toISOString()
    });

    // Verify both exist
    const projectBefore = await db.select().from(tables.projects).where(eq(tables.projects.id, testProjectId)).limit(1);
    const graphBefore = await db.select().from(tables.graphs).where(eq(tables.graphs.id, testGraphId)).limit(1);
    expect(projectBefore.length).toBe(1);
    expect(graphBefore.length).toBe(1);

    // 4. Delete the project
    await db.delete(tables.projects).where(eq(tables.projects.id, testProjectId));

    // 5. Verify cascade deletion has removed the linked graph as well
    const projectAfter = await db.select().from(tables.projects).where(eq(tables.projects.id, testProjectId)).limit(1);
    const graphAfter = await db.select().from(tables.graphs).where(eq(tables.graphs.id, testGraphId)).limit(1);

    expect(projectAfter.length).toBe(0);
    expect(graphAfter.length).toBe(0); // Should be cascade deleted!
  });
});
