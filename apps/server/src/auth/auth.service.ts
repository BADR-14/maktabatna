import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../prisma.service.ts';
import type { LoginDto, RegisterDto } from './auth.dto.ts';

const REFRESH_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 6 months: phones stay signed in, offline included

export type PublicUser = { id: string; displayName: string; username: string };

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function sameSecret(a: string, b: string) {
  const x = Buffer.from(sha256(a));
  const y = Buffer.from(sha256(b));
  return timingSafeEqual(x, y);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const invite = process.env.INVITE_CODE;
    if (!invite || !sameSecret(dto.inviteCode.trim(), invite)) {
      throw new ForbiddenException('رمز الدعوة غلط');
    }
    const username = dto.username.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { username } })) {
      throw new ConflictException('اسم المستخدم مستعمل');
    }
    const now = BigInt(Date.now());
    const id = randomUUID();
    const user = await this.prisma.user.create({
      data: {
        id,
        createdAt: now,
        updatedAt: now,
        createdBy: id,
        updatedBy: id,
        displayName: dto.displayName.trim(),
        username,
        passwordHash: await hash(dto.password),
      },
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username.trim().toLowerCase() } });
    // Same message for unknown user and wrong password.
    if (!user || user.deletedAt !== null || !(await verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('اسم المستخدم أو كلمة السر غلط');
    }
    return this.issueTokens(user);
  }

  /** Rotates the refresh token: the old one stops working. */
  async refresh(refreshToken: string) {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!row || row.expiresAt < BigInt(Date.now()) || row.user.deletedAt !== null) {
      throw new UnauthorizedException('انتهت الجلسة، سجّل دخول من جديد');
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    return this.issueTokens(row.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(refreshToken) } });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt !== null) throw new UnauthorizedException();
    return toPublic(user);
  }

  private async issueTokens(user: { id: string; displayName: string; username: string }) {
    const refreshToken = randomBytes(32).toString('base64url');
    const now = Date.now();
    await this.prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        tokenHash: sha256(refreshToken),
        createdAt: BigInt(now),
        expiresAt: BigInt(now + REFRESH_TTL_MS),
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return { accessToken, refreshToken, user: toPublic(user) };
  }
}

function toPublic(user: { id: string; displayName: string; username: string }): PublicUser {
  return { id: user.id, displayName: user.displayName, username: user.username };
}
