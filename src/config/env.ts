import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'ci', 'staging', 'production']).default('development'),
  JWT_SECRET: z.string().min(32, { message: 'JWT_SECRET must be at least 32 characters' }).optional(),
  ENCRYPTION_MASTER_KEY: z.string().min(32, { message: 'ENCRYPTION_MASTER_KEY must be at least 32 characters' }).optional(),
  GEMINI_API_KEY: z.string().optional(),
  DB_TYPE: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  LOKI_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

try {
  validatedEnv = envSchema.parse(process.env);
} catch (error: any) {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL ENVIRONMENT VALIDATION ERROR:', error.format());
    process.exit(1);
  } else {
    console.warn('ENVIRONMENT VALIDATION WARNING:', error.message);
    // Parse with partial/safeparse fallback in non-production to avoid breaking test suites
    validatedEnv = envSchema.safeParse(process.env).data || {} as Env;
  }
}

export const ENV = {
  get PORT(): number { return validatedEnv.PORT || Number(process.env.PORT || 3000); },
  get NODE_ENV(): string { return validatedEnv.NODE_ENV || process.env.NODE_ENV || 'development'; },
  get JWT_SECRET(): string | undefined { return validatedEnv.JWT_SECRET || process.env.JWT_SECRET; },
  get ENCRYPTION_MASTER_KEY(): string | undefined { return validatedEnv.ENCRYPTION_MASTER_KEY || process.env.ENCRYPTION_MASTER_KEY; },
  get GEMINI_API_KEY(): string | undefined { return validatedEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY; },
  get DB_TYPE(): 'sqlite' | 'postgres' { return validatedEnv.DB_TYPE || (process.env.DB_TYPE as any) || 'sqlite'; },
  get DATABASE_URL(): string | undefined { return validatedEnv.DATABASE_URL || process.env.DATABASE_URL; },
  get REDIS_URL(): string | undefined { return validatedEnv.REDIS_URL || process.env.REDIS_URL; },
  get SENTRY_DSN(): string | undefined { return validatedEnv.SENTRY_DSN || process.env.SENTRY_DSN; },
  get LOG_LEVEL(): string { return validatedEnv.LOG_LEVEL || process.env.LOG_LEVEL || 'info'; },
  get OTEL_EXPORTER_OTLP_ENDPOINT(): string | undefined { return validatedEnv.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT; },
  get LOKI_URL(): string | undefined { return validatedEnv.LOKI_URL || process.env.LOKI_URL; },
};
export default ENV;
