import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 40, { message: 'الاسم لازم يكون بين 2 و40 حرف' })
  displayName!: string;

  /** Latin letters, digits, dot, underscore; stored lowercase. */
  @IsString()
  @Matches(/^[a-zA-Z0-9._]{3,30}$/, { message: 'اسم المستخدم لازم يكون 3-30 حرف إنجليزي أو رقم' })
  username!: string;

  @IsString()
  @Length(6, 100, { message: 'كلمة السر لازم تكون 6 أحرف أو أكتر' })
  password!: string;

  @IsString()
  inviteCode!: string;
}

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
