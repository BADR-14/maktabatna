import { Module } from '@nestjs/common';

import { HealthController } from './health.controller.ts';
import { PrismaService } from './prisma.service.ts';

@Module({
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
