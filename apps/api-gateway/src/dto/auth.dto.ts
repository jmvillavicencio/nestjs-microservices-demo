import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

// Request DTOs
export class RegisterDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Password123', description: 'Password (min 8 chars, uppercase, lowercase, number)' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from client-side authentication' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class AppleAuthDto {
  @ApiProperty({ description: 'Apple identity token' })
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @ApiProperty({ description: 'Apple authorization code' })
  @IsString()
  @IsNotEmpty()
  authorizationCode: string;

  @ApiPropertyOptional({ description: 'User first name (only provided on first sign-in)' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name (only provided on first sign-in)' })
  @IsString()
  @IsOptional()
  lastName?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword123', description: 'New password' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123', description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123', description: 'New password' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class CheckEmailDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email address to check availability' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// Response DTOs
export class UserInfoDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'email', enum: ['email', 'google', 'apple'] })
  provider: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token for obtaining new access tokens' })
  refreshToken: string;

  @ApiProperty({ type: UserInfoDto })
  user: UserInfoDto;

  @ApiProperty({ example: 900, description: 'Access token expiration time in seconds' })
  expiresIn: number;
}

export class MessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}

export class CheckEmailResponseDto {
  @ApiProperty({ example: true, description: 'Whether the email is available for registration' })
  available: boolean;
}
