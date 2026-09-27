import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module.ts';
import { HealthController } from './health.controller.ts';
import { PrismaModule } from './prisma.module.ts';
import { SyncModule } from './sync/sync.module.ts';

@Module({
  imports: [PrismaModule, AuthModule, SyncModule],
  controllers: [HealthController],
})
export class AppModule {}
