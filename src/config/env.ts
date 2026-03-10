import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    MISTRAL_API_KEY: z.string().optional(),
    SPORTS_API_KEY: z.string().optional(),
    SPORTS_API_BASE_URL: z.string().url().default('https://v3.football.api-sports.io'),
    GUARDIAN_API_KEY: z.string().optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    ALLOWED_ORIGINS: z.string().optional().default(''),
    REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      const requiredInProd: Array<keyof typeof data> = [
        'MISTRAL_API_KEY',
        'SPORTS_API_KEY',
        'GUARDIAN_API_KEY',
      ];
      for (const key of requiredInProd) {
        if (!data[key] || (data[key] as string).trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required in production`,
          });
        }
      }
    } else {
      const optionalInDev: Array<keyof typeof data> = [
        'MISTRAL_API_KEY',
        'SPORTS_API_KEY',
        'GUARDIAN_API_KEY',
      ];
      for (const key of optionalInDev) {
        if (!data[key] || (data[key] as string).trim().length === 0) {
          console.warn(`[env] WARNING: ${key} is not set (optional in development)`);
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] ❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

