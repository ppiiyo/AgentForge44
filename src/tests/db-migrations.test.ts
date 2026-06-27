import { describe, it, expect } from 'vitest';
import { SqliteDatabaseAdapter } from '../db/adapters.js';
import * as sqliteSchema from '../db/schema.js';
import { runSchemaMigrations } from '../api/migrate.js';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

describe('=== Task 2.1: DB Schema, Programmatic Migrations, and Cascade Deletes ===', () => {

  it('should run schema migrations programmatically and ensure they are idempotent', async () => {
    const testDbPath = path.join(process.cwd(), `test_migrations_${Date.now()}.db`);
    const testAdapter = new SqliteDatabaseAdapter(testDbPath);
    const testDb = testAdapter.db;

    try {
      // 1. Run migrations
      await expect(runSchemaMigrations(testAdapter)).resolves.not.toThrow();

      // 2. Ensure default-workspace is seeded successfully
      const workspacesList = await testDb.select().from(sqliteSchema.workspaces).where(eq(sqliteSchema.workspaces.id, 'default-workspace')).limit(1);
      expect(workspacesList.length).toBe(1);
      expect(workspacesList[0].id).toBe('default-workspace');
      expect(workspacesList[0].name).toBe('Default Workspace');

      // 3. Re-running migrations should be safe and idempotent
      await expect(runSchemaMigrations(testAdapter)).resolves.not.toThrow();
    } finally {
      await testAdapter.close();
      if (fs.existsSync(testDbPath)) {
        try {
          fs.unlinkSync(testDbPath);
          if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
          if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
        } catch (e) {}
      }
    }
  });

  it('should enforce graphs.projectId -> projects.id ON DELETE CASCADE foreign key constraint', async () => {
    const testDbPath = path.join(process.cwd(), `test_cascade_${Date.now()}.db`);
    const testAdapter = new SqliteDatabaseAdapter(testDbPath);
    const testDb = testAdapter.db;

    try {
      // Run migrations to create the tables
      await runSchemaMigrations(testAdapter);

      const testProjectId = `proj_cascade_${Date.now()}`;
      const testGraphId = `graph_cascade_${Date.now()}`;
      const wsId = 'default-workspace';

      // 2. Insert test project
      await testDb.insert(sqliteSchema.projects).values({
        id: testProjectId,
        name: 'Test Project Cascade',
        userId: 'test_user',
        tenantId: wsId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 3. Insert test graph linked to that project
      await testDb.insert(sqliteSchema.graphs).values({
        id: testGraphId,
        projectId: testProjectId,
        name: 'Test Graph Cascade',
        nodes: '[]',
        connections: '[]',
        tenantId: wsId,
        createdAt: new Date().toISOString()
      });

      // Verify both exist
      const projectBefore = await testDb.select().from(sqliteSchema.projects).where(eq(sqliteSchema.projects.id, testProjectId)).limit(1);
      const graphBefore = await testDb.select().from(sqliteSchema.graphs).where(eq(sqliteSchema.graphs.id, testGraphId)).limit(1);
      expect(projectBefore.length).toBe(1);
      expect(graphBefore.length).toBe(1);

      // 4. Delete the project
      await testDb.delete(sqliteSchema.projects).where(eq(sqliteSchema.projects.id, testProjectId));

      // 5. Verify cascade deletion has removed the linked graph as well
      const projectAfter = await testDb.select().from(sqliteSchema.projects).where(eq(sqliteSchema.projects.id, testProjectId)).limit(1);
      const graphAfter = await testDb.select().from(sqliteSchema.graphs).where(eq(sqliteSchema.graphs.id, testGraphId)).limit(1);

      expect(projectAfter.length).toBe(0);
      expect(graphAfter.length).toBe(0); // Should be cascade deleted!
    } finally {
      await testAdapter.close();
      if (fs.existsSync(testDbPath)) {
        try {
          fs.unlinkSync(testDbPath);
          if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
          if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
        } catch (e) {}
      }
    }
  });
});
