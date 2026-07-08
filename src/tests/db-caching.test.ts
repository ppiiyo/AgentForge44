import { describe, it, expect, vi } from 'vitest';
import { db, tables } from '../db/index.js';
import { cache } from '../services/cache.js';
import { eq } from 'drizzle-orm';

describe('=== Task 3.1: Database Query Caching & Invalidation ===', () => {
  it('should cache consecutive SELECT queries and invalidate cache on mutations', async () => {
    // 1. Seed a temporary test project
    const testProjectId = `test_cache_proj_${Date.now()}`;
    await db.insert(tables.projects).values({
      id: testProjectId,
      name: 'Cache Test Project',
      userId: 'test_user',
      tenantId: 'default-workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      // Clear any pre-existing cache to make the test pristine
      await cache.clearLocalCache();

      // Spy on the cache.get and cache.set methods
      const getSpy = vi.spyOn(cache, 'get');
      const setSpy = vi.spyOn(cache, 'set');

      // 2. Execute first SELECT query (should miss cache, query DB, and write to cache)
      const select1 = await db.select().from(tables.projects).where(eq(tables.projects.id, testProjectId));
      expect(select1.length).toBe(1);
      expect(select1[0].name).toBe('Cache Test Project');

      // Check spy results for the first select
      expect(getSpy).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalled();

      // Reset spy call history
      getSpy.mockClear();
      setSpy.mockClear();

      // 3. Execute second identical SELECT query (should hit cache directly, no database select)
      const select2 = await db.select().from(tables.projects).where(eq(tables.projects.id, testProjectId));
      expect(select2.length).toBe(1);
      expect(select2[0].name).toBe('Cache Test Project');

      expect(getSpy).toHaveBeenCalled();
      // Should not have set the cache again since it was a hit
      expect(setSpy).not.toHaveBeenCalled();

      // Reset spies
      getSpy.mockClear();
      setSpy.mockClear();

      // 4. Perform an UPDATE mutation (should trigger cache invalidation / local clear)
      await db.update(tables.projects)
        .set({ name: 'Updated Cache Project' })
        .where(eq(tables.projects.id, testProjectId));

      // 5. Execute SELECT query again after mutation (should miss cache and query DB fresh)
      const select3 = await db.select().from(tables.projects).where(eq(tables.projects.id, testProjectId));
      expect(select3.length).toBe(1);
      expect(select3[0].name).toBe('Updated Cache Project'); // Should see the updated name!

      expect(getSpy).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalled(); // Should have written to cache again!

      getSpy.mockRestore();
      setSpy.mockRestore();
    } finally {
      // Cleanup the test project
      await db.delete(tables.projects).where(eq(tables.projects.id, testProjectId));
    }
  });
});
