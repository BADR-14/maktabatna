import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Needed for migrate/studio only; `prisma generate` works without it (e.g. on npm install).
  datasource: { url: process.env.DATABASE_URL },
});
