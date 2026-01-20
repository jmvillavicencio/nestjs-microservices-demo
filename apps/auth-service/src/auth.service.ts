import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { TokenService, TokenPayload } from './services/token.service';
import { PasswordService } from './services/password.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AppleAuthService } from './services/apple-auth.service';
import { UserRepository, AuthUser } from './repositories/user.repository';
import { RabbitMQService } from './rabbitmq.service';
import { AuthProvider } from '@prisma/client';
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
  GetProfileRequest,
  AuthResponse,
  ValidateTokenResponse,
  LogoutResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  ChangePasswordResponse,
  GetProfileResponse,
  UserInfo,
} from '@app/proto';
import { AUTH_EVENTS } from '@app/common';

/**
 * Service responsible for authentication operations.
 * Handles user registration, login, OAuth authentication, token management, and password operations.
 */
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

  /**
   * Registers a new user with email and password.
   * @param data - Registration request containing email, name, and password
   * @returns Authentication response with tokens and user info
   * @throws RpcException if user with email already exists or password is invalid
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    this.logger.log(`Registering new user with email: ${data.email}`);

    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      this.logger.warn(`Registration failed: email ${data.email} already exists`);
      throw new RpcException('User with this email already exists');
    }

    const passwordValidation = this.passwordService.validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new RpcException(passwordValidation.message || 'Invalid password');
    }

    const hashedPassword = await this.passwordService.hash(data.password);
    const user = await this.userRepository.create({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      provider: AuthProvider.email,
    });

    const tokens = await this.generateAuthResponse(user);

    await this.rabbitMQService.emit(AUTH_EVENTS.USER_REGISTERED, {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      createdAt: user.createdAt.toISOString(),
    });

    this.logger.log(`User registered successfully: ${user.id}`);
    return tokens;
  }

  /**
   * Authenticates a user with email and password.
   * @param data - Login request containing email and password
   * @returns Authentication response with tokens and user info
   * @throws RpcException if credentials are invalid or user doesn't exist
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    this.logger.log(`Login attempt for email: ${data.email}`);

    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      this.logger.warn(`Login failed: user ${data.email} not found`);
      throw new RpcException('Invalid email or password');
    }

    if (user.provider !== AuthProvider.email || !user.password) {
      throw new RpcException(`Please sign in with ${user.provider}`);
    }

    const isPasswordValid = await this.passwordService.compare(data.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: invalid password for ${data.email}`);
      throw new RpcException('Invalid email or password');
    }

    const tokens = await this.generateAuthResponse(user);

    await this.rabbitMQService.emit(AUTH_EVENTS.USER_LOGGED_IN, {
      id: user.id,
      email: user.email,
      provider: user.provider,
      loggedInAt: new Date().toISOString(),
    });

    this.logger.log(`User logged in successfully: ${user.id}`);
    return tokens;
  }

  /**
   * Authenticates a user using Google OAuth.
   * Creates a new user if one doesn't exist with the Google account.
   * @param data - Google auth request containing the ID token
   * @returns Authentication response with tokens and user info
   * @throws RpcException if token is invalid or email conflict exists
   */
  async googleAuth(data: GoogleAuthRequest): Promise<AuthResponse> {
    this.logger.log('Processing Google authentication');

    const googleUser = await this.googleAuthService.verifyIdToken(data.idToken);

    if (!googleUser) {
      throw new RpcException('Invalid Google token');
    }

    if (!googleUser.emailVerified) {
      throw new RpcException('Google email not verified');
    }

    let user = await this.userRepository.findByProvider(AuthProvider.google, googleUser.id);

    if (!user) {
      const existingUser = await this.userRepository.findByEmail(googleUser.email);
      if (existingUser) {
        throw new RpcException('An account with this email already exists. Please sign in with your original method.');
      }

      user = await this.userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        provider: AuthProvider.google,
        providerId: googleUser.id,
      });

      await this.rabbitMQService.emit(AUTH_EVENTS.USER_REGISTERED, {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      });
    }

    const tokens = await this.generateAuthResponse(user);

    await this.rabbitMQService.emit(AUTH_EVENTS.USER_LOGGED_IN, {
      id: user.id,
      email: user.email,
      provider: user.provider,
      loggedInAt: new Date().toISOString(),
    });

    this.logger.log(`Google auth successful for user: ${user.id}`);
    return tokens;
  }

  /**
   * Authenticates a user using Apple Sign In.
   * Creates a new user if one doesn't exist with the Apple account.
   * @param data - Apple auth request containing the identity token
   * @returns Authentication response with tokens and user info
   * @throws RpcException if token is invalid or email conflict exists
   */
  async appleAuth(data: AppleAuthRequest): Promise<AuthResponse> {
    this.logger.log('Processing Apple authentication');

    const appleUser = await this.appleAuthService.verifyIdentityToken(data.identityToken);

    if (!appleUser) {
      throw new RpcException('Invalid Apple token');
    }

    let user = await this.userRepository.findByProvider(AuthProvider.apple, appleUser.id);

    if (!user) {
      if (appleUser.email) {
        const existingUser = await this.userRepository.findByEmail(appleUser.email);
        if (existingUser) {
          throw new RpcException('An account with this email already exists. Please sign in with your original method.');
        }
      }

      const name = data.firstName && data.lastName
        ? `${data.firstName} ${data.lastName}`
        : appleUser.email?.split('@')[0] || 'Apple User';

      user = await this.userRepository.create({
        email: appleUser.email || `${appleUser.id}@privaterelay.appleid.com`,
        name,
        provider: AuthProvider.apple,
        providerId: appleUser.id,
      });

      await this.rabbitMQService.emit(AUTH_EVENTS.USER_REGISTERED, {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      });
    }

    const tokens = await this.generateAuthResponse(user);

    await this.rabbitMQService.emit(AUTH_EVENTS.USER_LOGGED_IN, {
      id: user.id,
      email: user.email,
      provider: user.provider,
      loggedInAt: new Date().toISOString(),
    });

    this.logger.log(`Apple auth successful for user: ${user.id}`);
    return tokens;
  }

  /**
   * Refreshes the authentication tokens using a valid refresh token.
   * @param data - Refresh token request containing the refresh token
   * @returns New authentication response with fresh tokens
   * @throws RpcException if refresh token is invalid or expired
   */
  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    this.logger.log('Processing token refresh');

    const userId = await this.tokenService.validateRefreshToken(data.refreshToken);

    if (!userId) {
      throw new RpcException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new RpcException('User not found');
    }

    await this.tokenService.revokeRefreshToken(data.refreshToken);

    this.logger.log(`Token refreshed for user: ${userId}`);
    return this.generateAuthResponse(user);
  }

  /**
   * Validates an access token and returns user information.
   * @param data - Validation request containing the access token
   * @returns Validation response with validity status and user info if valid
   */
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

  /**
   * Logs out a user by revoking their refresh token.
   * @param data - Logout request containing the refresh token to revoke
   * @returns Logout response indicating success
   */
  async logout(data: LogoutRequest): Promise<LogoutResponse> {
    this.logger.log('Processing logout');
    await this.tokenService.revokeRefreshToken(data.refreshToken);
    return { success: true };
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   * @param data - Get profile request containing the user ID
   * @returns Profile response with user information
   * @throws RpcException if user is not found
   */
  async getProfile(data: GetProfileRequest): Promise<GetProfileResponse> {
    this.logger.log(`Fetching profile for user: ${data.userId}`);

    const user = await this.userRepository.findById(data.userId);

    if (!user) {
      this.logger.warn(`Profile not found for user: ${data.userId}`);
      throw new RpcException('User not found');
    }

    return {
      user: this.toUserInfo(user),
    };
  }

  /**
   * Initiates the password reset process by generating a reset token.
   * Always returns success to prevent email enumeration attacks.
   * @param data - Forgot password request containing the user's email
   * @returns Response indicating the request was processed
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    this.logger.log(`Processing forgot password for: ${data.email}`);

    const user = await this.userRepository.findByEmail(data.email);

    if (!user || user.provider !== AuthProvider.email) {
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

  /**
   * Completes the password reset process with a valid reset token.
   * @param data - Reset password request containing the token and new password
   * @returns Response indicating success
   * @throws RpcException if token is invalid, expired, or password is invalid
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    this.logger.log('Processing password reset');

    const user = await this.userRepository.findByPasswordResetToken(data.token);

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new RpcException('Invalid or expired password reset token');
    }

    const passwordValidation = this.passwordService.validatePasswordStrength(data.newPassword);
    if (!passwordValidation.valid) {
      throw new RpcException(passwordValidation.message || 'Invalid password');
    }

    const hashedPassword = await this.passwordService.hash(data.newPassword);
    await this.userRepository.update(user.id, { password: hashedPassword });
    await this.userRepository.clearPasswordResetToken(user.id);

    await this.tokenService.revokeAllUserTokens(user.id);

    await this.rabbitMQService.emit(AUTH_EVENTS.PASSWORD_RESET_COMPLETED, {
      userId: user.id,
      email: user.email,
      completedAt: new Date().toISOString(),
    });

    this.logger.log(`Password reset completed for user: ${user.id}`);
    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  /**
   * Changes a user's password after verifying their current password.
   * @param data - Change password request containing userId, current password, and new password
   * @returns Response indicating success
   * @throws RpcException if user not found, current password is incorrect, or new password is invalid
   */
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    this.logger.log(`Processing password change for user: ${data.userId}`);

    const user = await this.userRepository.findById(data.userId);

    if (!user) {
      throw new RpcException('User not found');
    }

    if (user.provider !== AuthProvider.email || !user.password) {
      throw new RpcException('Password change not available for OAuth users');
    }

    const isCurrentPasswordValid = await this.passwordService.compare(
      data.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new RpcException('Current password is incorrect');
    }

    const passwordValidation = this.passwordService.validatePasswordStrength(data.newPassword);
    if (!passwordValidation.valid) {
      throw new RpcException(passwordValidation.message || 'Invalid password');
    }

    const hashedPassword = await this.passwordService.hash(data.newPassword);
    await this.userRepository.update(user.id, { password: hashedPassword });

    await this.rabbitMQService.emit(AUTH_EVENTS.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      changedAt: new Date().toISOString(),
    });

    this.logger.log(`Password changed for user: ${user.id}`);
    return {
      success: true,
      message: 'Password has been changed successfully',
    };
  }

  /**
   * Generates an authentication response with tokens for a user.
   * @param user - The authenticated user
   * @returns Authentication response with tokens and user info
   */
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

  /**
   * Converts an AuthUser entity to UserInfo DTO.
   * @param user - The AuthUser entity
   * @returns The formatted UserInfo response
   */
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
