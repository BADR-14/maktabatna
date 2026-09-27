import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.ts';

/** One shared database pool for the whole app. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
