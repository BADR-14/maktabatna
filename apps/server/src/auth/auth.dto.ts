import { IsOptional, IsString, Length, Matches } from 'class-validator';

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

export class GoogleDto {
  /** The ID token Google gives the phone after the person picks their account. */
  @IsString()
  idToken!: string;

  /** Needed only the first time, to create the account. */
  @IsOptional()
  @IsString()
  inviteCode?: string;

  @IsOptional()
  @IsString()
  @Length(2, 40, { message: 'يجب أن يكون الاسم بين 2 و40 حرفاً' })
  displayName?: string;
}

export class GoogleLinkDto {
  @IsString()
  idToken!: string;
}
