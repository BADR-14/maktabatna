import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard.ts';
import { SyncService, type PushBody } from './sync.service.ts';

/** Phones send their changes (push) and fetch everyone else's (pull). Signed-in family only. */
@Controller('sync')
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @HttpCode(200)
  push(@Body() body: PushBody) {
    return this.sync.push(body);
  }

  @Get('pull')
  pull(@Query('since') since?: string) {
    const n = Number(since ?? 0);
    return this.sync.pull(Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  }
}
