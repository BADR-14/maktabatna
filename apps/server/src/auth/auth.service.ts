import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../prisma.service.ts';
import { isAdmin } from './admins.ts';
import type { GoogleDto, LoginDto, RegisterDto } from './auth.dto.ts';

const REFRESH_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 6 months: phones stay signed in, offline included

export type PublicUser = { id: string; displayName: string; username: string; isAdmin: boolean };

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

  private readonly google = new OAuth2Client();

  private checkInvite(code: string | undefined) {
    const invite = process.env.INVITE_CODE;
    if (!invite || !code || !sameSecret(code.trim(), invite)) {
      throw new ForbiddenException('رمز الدعوة غير صحيح');
    }
  }

  async register(dto: RegisterDto) {
    this.checkInvite(dto.inviteCode);
    const username = dto.username.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { username } })) {
      throw new ConflictException('اسم المستخدم مستخدم مسبقاً');
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
    if (user && user.deletedAt === null && !user.passwordHash) {
      throw new UnauthorizedException('هذا الحساب يسجّل الدخول بحساب Google');
    }
    if (!user || user.deletedAt !== null || !user.passwordHash || !(await verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة');
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
      throw new UnauthorizedException('انتهت الجلسة، سجّل الدخول من جديد');
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    return this.issueTokens(row.user);
  }

  /** What the phone needs to show the Google button (nothing secret). */
  config() {
    return { googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || null };
  }

  /** Checks a Google ID token was issued for our app and returns the Google account. */
  private async verifyGoogle(idToken: string) {
    const audience = process.env.GOOGLE_WEB_CLIENT_ID;
    if (!audience) throw new ServiceUnavailableException('الدخول بحساب Google غير مفعّل على الخادم');
    try {
      const ticket = await this.google.verifyIdToken({ idToken, audience });
      const p = ticket.getPayload();
      if (!p?.sub) throw new Error('no subject');
      return { sub: p.sub, email: p.email_verified ? (p.email ?? null) : null, name: p.name ?? null };
    } catch {
      throw new UnauthorizedException('تعذّر التحقق من حساب Google، حاول مرة أخرى');
    }
  }

  /**
   * Signs in with Google. A Google account already linked to a user signs straight in; a new one
   * needs the family invite code, like registering.
   */
  async googleSignIn(dto: GoogleDto) {
    const g = await this.verifyGoogle(dto.idToken);
    const linked = await this.prisma.user.findUnique({ where: { googleSub: g.sub } });
    if (linked) {
      if (linked.deletedAt !== null) throw new UnauthorizedException('هذا الحساب موقوف');
      return this.issueTokens(linked);
    }
    if (!dto.inviteCode) {
      throw new ForbiddenException({ statusCode: 403, code: 'INVITE_REQUIRED', message: 'أول مرة؟ أدخل رمز الدعوة لإنشاء حسابك.' });
    }
    this.checkInvite(dto.inviteCode);
    const displayName = (dto.displayName ?? g.name ?? g.email?.split('@')[0] ?? 'عضو جديد').trim().slice(0, 40);
    const now = BigInt(Date.now());
    const id = randomUUID();
    const user = await this.prisma.user.create({
      data: {
        id,
        createdAt: now,
        updatedAt: now,
        createdBy: id,
        updatedBy: id,
        displayName,
        username: await this.freeUsername(g.email?.split('@')[0] ?? 'user'),
        googleSub: g.sub,
        email: g.email,
      },
    });
    return this.issueTokens(user);
  }

  /** Links a Google account to the signed-in user, so they can sign in with either. */
  async linkGoogle(userId: string, idToken: string) {
    const g = await this.verifyGoogle(idToken);
    const other = await this.prisma.user.findUnique({ where: { googleSub: g.sub } });
    if (other && other.id !== userId) throw new ConflictException('حساب Google هذا مربوط بمستخدم آخر');
    await this.prisma.user.update({ where: { id: userId }, data: { googleSub: g.sub, email: g.email } });
    return { email: g.email };
  }

  /** A username from the email's first part, made unique with a number if needed. */
  private async freeUsername(base: string) {
    const clean = base.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 24) || 'user';
    for (let i = 0; ; i++) {
      const name = i ? `${clean}${i}` : clean.length >= 3 ? clean : `${clean}-1`;
      if (!(await this.prisma.user.findUnique({ where: { username: name } }))) return name;
    }
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
  return { id: user.id, displayName: user.displayName, username: user.username, isAdmin: isAdmin(user.username) };
}
