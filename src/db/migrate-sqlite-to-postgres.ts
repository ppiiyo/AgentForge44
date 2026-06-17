import Database from 'better-sqlite3';
import postgres from 'postgres';
import path from 'path';
import fs from 'fs';

const SQLITE_DB_PATH = path.join(process.cwd(), 'projects', 'metadata.db');
const POSTGRES_URL = process.env.DATABASE_URL;

async function migrate() {
  console.log('============================================================');
  console.log('   🤖 AGENTFORGE DB MIGRATION SYSTEM (SQLite -> Postgres)   ');
  console.log('============================================================');

  if (!POSTGRES_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }

  if (!fs.existsSync(SQLITE_DB_PATH)) {
    console.warn(`⚠️ Warning: SQLite Database file not found at: ${SQLITE_DB_PATH}`);
    console.log('Assuming fresh start. Nothing to migrate.');
    return;
  }

  const isRollback = process.argv.includes('--rollback');
  const sql = postgres(POSTGRES_URL, { max: 1 });
  const sqlite = new Database(SQLITE_DB_PATH);

  const tables = ['users', 'metrics', 'versions', 'deployments'];

  if (isRollback) {
    console.log('🧹 Rollback requested. Truncating target Postgres tables...');
    for (const table of tables) {
      try {
        await sql.unsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`  ✅ Truncated Postgres table: ${table}`);
      } catch (err: any) {
        console.error(`  ❌ Failed to truncate table "${table}":`, err.message);
      }
    }
    console.log('✅ Rollback completed successfully.');
    sqlite.close();
    await sql.end();
    return;
  }

  console.log('⚡ Scanning tables and executing migration transactions...');

  try {
    for (const table of tables) {
      // Check if source SQLite table exists
      const sqliteTableCheck = sqlite.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(table);

      if (!sqliteTableCheck) {
        console.log(`ℹ️ SQLite table "${table}" does not exist. Skipping...`);
        continue;
      }

      // Load rows
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      console.log(`📦 Found ${rows.length} rows inside SQLite table "${table}".`);

      if (rows.length === 0) continue;

      console.log(`🚀 Migrating "${table}" table to PostgreSQL...`);
      
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          const keys = Object.keys(row);
          const columnNames = keys.map(k => {
            // Map camelCase naming to clean snake_case database schema definition keys
            if (k === 'passwordHash') return 'password_hash';
            if (k === 'usedTokens') return 'used_tokens';
            if (k === 'createdAt') return 'created_at';
            if (k === 'graphId') return 'graph_id';
            if (k === 'graphName') return 'graph_name';
            if (k === 'totalTokens') return 'total_tokens';
            if (k === 'totalCostUsd') return 'total_cost_usd';
            if (k === 'totalLatencyMs') return 'total_latency_ms';
            if (k === 'errorMessage') return 'error_message';
            if (k === 'nodeExecutions') return 'node_executions';
            if (k === 'versionNumber') return 'version_number';
            if (k === 'commitMessage') return 'commit_message';
            if (k === 'diffSummary') return 'diff_summary';
            if (k === 'authHeaderMask') return 'auth_header_mask';
            if (k === 'rateLimitRps') return 'rate_limit_rps';
            if (k === 'secretMasking') return 'secret_masking';
            return k.replace(/([A-Z])/g, "_$1").toLowerCase();
          });

          const pgValues = keys.map(k => (row as any)[k]);
          
          await sql`
            INSERT INTO ${sql(table)} ${sql(columnNames)}
            VALUES ${sql(pgValues)}
            ON CONFLICT (id) DO UPDATE SET
            ${sql(
              columnNames.reduce((acc, col, idx) => {
                if (col !== 'id') {
                  acc[col] = pgValues[idx];
                }
                return acc;
              }, {} as Record<string, any>)
            )}
          `;
        }
      }

      // comparative checksum validation
      const pgCountRes = await sql`SELECT COUNT(*)::int as count FROM ${sql(table)}`;
      const pgCount = pgCountRes[0]?.count || 0;
      
      console.log(`🔍 Data integrity validation for "${table}":`);
      console.log(`  - SQLite records (Source): ${rows.length}`);
      console.log(`  - PostgreSQL records (Target): ${pgCount}`);

      if (pgCount < rows.length) {
        throw new Error(`Integrity Check Failed: Table "${table}" has fewer rows than source SQLite.`);
      }
      console.log(`  ✅ Validation successfully completed for "${table}".`);
    }

    console.log('============================================================');
    console.log('🎉 SUCCESS: Database migration executed and validated successfully!');
    console.log('============================================================');
  } catch (err: any) {
    console.error('❌ Critical Migration Failed:', err.message);
    console.log('⚠️ Rolling back partial migration steps...');
    for (const table of tables) {
      try {
        await sql.unsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      } catch (rErr: any) {
        console.error(`  Failed on rolling back table "${table}":`, rErr.message);
      }
    }
    console.log('⚠️ Rollback cleanly completed. Exiting with fault status.');
    process.exit(1);
  } finally {
    sqlite.close();
    await sql.end();
  }
}

migrate();
export { migrate };
