import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';

import { GoogleDto, GoogleLinkDto, LoginDto, RefreshDto, RegisterDto } from './auth.dto.ts';
import { AuthGuard, type AuthedRequest } from './auth.guard.ts';
import { AuthService } from './auth.service.ts';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('config')
  config() {
    return this.auth.config();
  }

  @Post('google')
  @HttpCode(200)
  google(@Body() dto: GoogleDto) {
    return this.auth.googleSignIn(dto);
  }

  @Post('google/link')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  linkGoogle(@Req() req: AuthedRequest, @Body() dto: GoogleLinkDto) {
    return this.auth.linkGoogle(req.userId, dto.idToken);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.userId);
  }
}
