import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from './prisma.service.ts';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Used by the phones to check they can reach the server, and by Docker as a health check. */
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', time: Date.now() };
    } catch {
      throw new ServiceUnavailableException({ status: 'db_unreachable' });
    }
  }
}
