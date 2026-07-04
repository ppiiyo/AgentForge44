import { defineConfig } from 'drizzle-kit';

const dbType = process.env.DB_TYPE || 'sqlite';

export default defineConfig(
  dbType === 'postgres'
    ? {
        schema: './src/db/postgres-schema.ts',
        out: './drizzle/postgres',
        dialect: 'postgresql',
        dbCredentials: {
          url: process.env.DATABASE_URL || 'postgres://localhost:5432/kostromai44',
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
