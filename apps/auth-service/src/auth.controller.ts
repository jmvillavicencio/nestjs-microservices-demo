import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  RegisterRequest,
  LoginRequest,
  GoogleAuthRequest,
  AppleAuthRequest,
  RefreshTokenRequest,
  ValidateTokenRequest,
  LogoutRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthResponse,
  ValidateTokenResponse,
  LogoutResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  ChangePasswordResponse,
  AUTH_SERVICE_NAME,
} from '@app/proto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod(AUTH_SERVICE_NAME, 'Register')
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.authService.register(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Login')
  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'GoogleAuth')
  async googleAuth(data: GoogleAuthRequest): Promise<AuthResponse> {
    return this.authService.googleAuth(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'AppleAuth')
  async appleAuth(data: AppleAuthRequest): Promise<AuthResponse> {
    return this.authService.appleAuth(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'RefreshToken')
  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    return this.authService.refreshToken(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ValidateToken')
  async validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
    return this.authService.validateToken(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Logout')
  async logout(data: LogoutRequest): Promise<LogoutResponse> {
    return this.authService.logout(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ForgotPassword')
  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ResetPassword')
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.authService.resetPassword(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ChangePassword')
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return this.authService.changePassword(data);
  }
}
