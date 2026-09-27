import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 40, { message: 'يجب أن يكون الاسم بين 2 و40 حرفاً' })
  displayName!: string;

  /** Latin letters, digits, dot, underscore, hyphen; stored lowercase. */
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,30}$/, { message: 'يجب أن يتكون اسم المستخدم من 3 إلى 30 حرفاً إنجليزياً أو رقماً (ويُسمح بـ - و_ و.)' })
  username!: string;

  @IsString()
  @Length(6, 100, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' })
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
