import { defineConfig } from 'drizzle-kit';

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = process.env.DB_TYPE === 'postgres' || dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

export default defineConfig(
  isPostgres
    ? {
        schema: './src/db/postgres-schema.ts',
        out: './drizzle/postgres',
        dialect: 'postgresql',
        dbCredentials: {
          url: dbUrl || 'postgres://localhost:5432/kostromai44',
        },
      }
    : {
        schema: './src/db/schema.ts',
        out: './drizzle/sqlite',
        dialect: 'sqlite',
        dbCredentials: {
          url: './kostromai44.db',
        },
      }
);

