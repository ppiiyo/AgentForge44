import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/postgres-schema.ts',
  out: './drizzle/postgres',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/kostromai44',
  },
});
