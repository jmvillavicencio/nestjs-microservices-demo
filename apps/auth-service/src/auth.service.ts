import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { TokenService, TokenPayload } from './services/token.service';
import { PasswordService } from './services/password.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AppleAuthService } from './services/apple-auth.service';
import { UserRepository, AuthUser } from './repositories/user.repository';
import { RabbitMQService } from './rabbitmq.service';
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
  UserInfo,
} from '@app/proto';
import { AUTH_EVENTS } from '@app/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly passwordResetExpiresIn = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly appleAuthService: AppleAuthService,
    private readonly userRepository: UserRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new RpcException('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new RpcException(passwordValidation.message || 'Invalid password');
    }

    // Hash password and create user
    const hashedPassword = await this.passwordService.hash(data.password);
    const user = await this.userRepository.create({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      provider: 'email',
    });

    // Generate tokens
    const tokens = await this.generateAuthResponse(user);

    // Emit registration event
    await this.rabbitMQService.emit(AUTH_EVENTS.USER_REGISTERED, {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      createdAt: user.createdAt.toISOString(),
    });

    return tokens;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new RpcException('Invalid email or password');
    }

    if (user.provider !== 'email' || !user.password) {
      throw new RpcException(`Please sign in with ${user.provider}`);
    }

    const isPasswordValid = await this.passwordService.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new RpcException('Invalid email or password');
    }

    const tokens = await this.generateAuthResponse(user);

    // Emit login event
    await this.rabbitMQService.emit(AUTH_EVENTS.USER_LOGGED_IN, {
      id: user.id,
      email: user.email,
      provider: user.provider,
      loggedInAt: new Date().toISOString(),
    });

    return tokens;
  }

  async googleAuth(data: GoogleAuthRequest): Promise<AuthResponse> {
    const googleUser = await this.googleAuthService.verifyIdToken(data.idToken);

    if (!googleUser) {
      throw new RpcException('Invalid Google token');
    }

    if (!googleUser.emailVerified) {
      throw new RpcException('Google email not verified');
    }

    // Find or create user
    let user = await this.userRepository.findByProvider('google', googleUser.id);

    if (!user) {
      // Check if user exists with same email
      const existingUser = await this.userRepository.findByEmail(googleUser.email);
      if (existingUser) {
        throw new RpcException('An account with this email already exists. Please sign in with your original method.');
      }

      user = await this.userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        provider: 'google',
        providerId: googleUser.id,
      });

      // Emit registration event for new users
      await this.rabbitMQService.emit(AUTH_EVENTS.USER_REGISTERED, {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      });
    }

    const tokens = await this.generateAuthResponse(user);

    // Emit login event
    await this.rabbitMQService.emit(AUTH_EVENTS.USER_LOGGED_IN, {
      id: user.id,
      email: user.email,
      provider: user.provider,
      loggedInAt: new Date().toISOString(),
    });

    return tokens;
  }

  async appleAuth(data: AppleAuthRequest): Promise<AuthResponse> {
    const appleUser = await this.appleAuthService.verifyIdentityToken(data.identityToken);

    if (!appleUser) {
      throw new RpcException('Invalid Apple token');
    }

    // Find or create user
    let user = await this.userRepository.findByProvider('apple', appleUser.id);

    if (!user) {
      // Check if user exists with same email (if email is provided)
      if (appleUser.email) {
        const existingUser = await this.userRepository.findByEmail(appleUser.email);
        if (existingUser) {
          throw new RpcException('An account with this email already exists. Please sign in with your original method.');
        }
      }

      // Apple only provides name on first sign-in
      const name = data.firstName && data.lastName
        ? `${data.firstName} ${data.lastName}`
        : appleUser.email?.split('@')[0] || 'Apple User';

      user = await this.userRepository.create({
        email: appleUser.email || `${appleUser.id}@privaterelay.appleid.com`,
        name,
        provider: 'apple',
        providerId: appleUser.id,
      });

      // Emit registration event for new users
      await this.rabbitMQService.emit(AUTH_EVENTS.USER_REGISTERED, {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      });
    }

    const tokens = await this.generateAuthResponse(user);

    // Emit login event
    await this.rabbitMQService.emit(AUTH_EVENTS.USER_LOGGED_IN, {
      id: user.id,
      email: user.email,
      provider: user.provider,
      loggedInAt: new Date().toISOString(),
    });

    return tokens;
  }

  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    const userId = await this.tokenService.validateRefreshToken(data.refreshToken);

    if (!userId) {
      throw new RpcException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new RpcException('User not found');
    }

    // Revoke old refresh token
    await this.tokenService.revokeRefreshToken(data.refreshToken);

    // Generate new token pair
    return this.generateAuthResponse(user);
  }

  async validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
    const payload = await this.tokenService.validateAccessToken(data.accessToken);

    if (!payload) {
      return { valid: false };
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      return { valid: false };
    }

    return {
      valid: true,
      user: this.toUserInfo(user),
    };
  }

  async logout(data: LogoutRequest): Promise<LogoutResponse> {
    await this.tokenService.revokeRefreshToken(data.refreshToken);
    return { success: true };
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const user = await this.userRepository.findByEmail(data.email);

    // Always return success to prevent email enumeration
    if (!user || user.provider !== 'email') {
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      };
    }

    const resetToken = this.tokenService.generatePasswordResetToken();
    await this.userRepository.setPasswordResetToken(
      user.id,
      resetToken,
      this.passwordResetExpiresIn,
    );

    // Emit password reset requested event
    await this.rabbitMQService.emit(AUTH_EVENTS.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      email: user.email,
      token: resetToken,
      expiresAt: new Date(Date.now() + this.passwordResetExpiresIn).toISOString(),
      requestedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    };
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const user = await this.userRepository.findByPasswordResetToken(data.token);

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new RpcException('Invalid or expired password reset token');
    }

    // Validate new password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(data.newPassword);
    if (!passwordValidation.valid) {
      throw new RpcException(passwordValidation.message || 'Invalid password');
    }

    // Hash new password and update user
    const hashedPassword = await this.passwordService.hash(data.newPassword);
    await this.userRepository.update(user.id, { password: hashedPassword });
    await this.userRepository.clearPasswordResetToken(user.id);

    // Revoke all refresh tokens for security
    await this.tokenService.revokeAllUserTokens(user.id);

    // Emit password reset completed event
    await this.rabbitMQService.emit(AUTH_EVENTS.PASSWORD_RESET_COMPLETED, {
      userId: user.id,
      email: user.email,
      completedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const user = await this.userRepository.findById(data.userId);

    if (!user) {
      throw new RpcException('User not found');
    }

    if (user.provider !== 'email' || !user.password) {
      throw new RpcException('Password change not available for OAuth users');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.compare(
      data.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new RpcException('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(data.newPassword);
    if (!passwordValidation.valid) {
      throw new RpcException(passwordValidation.message || 'Invalid password');
    }

    // Hash new password and update user
    const hashedPassword = await this.passwordService.hash(data.newPassword);
    await this.userRepository.update(user.id, { password: hashedPassword });

    // Emit password changed event
    await this.rabbitMQService.emit(AUTH_EVENTS.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      changedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Password has been changed successfully',
    };
  }

  private async generateAuthResponse(user: AuthUser): Promise<AuthResponse> {
    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    };

    const tokens = await this.tokenService.generateTokenPair(tokenPayload);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserInfo(user),
      expiresIn: tokens.expiresIn,
    };
  }

  private toUserInfo(user: AuthUser): UserInfo {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
