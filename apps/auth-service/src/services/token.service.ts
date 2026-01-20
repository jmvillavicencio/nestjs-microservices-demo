import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

/**
 * Payload structure for JWT access tokens.
 */
export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  provider: string;
}

/**
 * Structure containing both access and refresh tokens.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Service responsible for JWT token operations.
 * Handles access token generation, refresh token management, and token validation.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiresIn = 15 * 60; // 15 minutes in seconds
  private readonly refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable must be configured');
    }
    this.jwtSecret = secret;
  }

  /**
   * Generates a new pair of access and refresh tokens for a user.
   * @param payload - The user data to encode in the access token
   * @returns A token pair containing access token, refresh token, and expiration time
   */
  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    this.logger.log(`Generating token pair for user: ${payload.sub}`);

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload.sub);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  /**
   * Generates a JWT access token with the provided payload.
   * @param payload - The user data to encode in the token
   * @returns The signed JWT access token
   */
  private generateAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn,
      secret: this.jwtSecret,
    });
  }

  /**
   * Generates a new refresh token and stores it in the database.
   * @param userId - The ID of the user the token belongs to
   * @returns The generated refresh token string
   */
  private async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000);

    await this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
    });

    return token;
  }

  /**
   * Validates a JWT access token and returns its payload.
   * @param token - The JWT access token to validate
   * @returns The token payload if valid, null otherwise
   */
  async validateAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.jwtSecret,
      });
      return payload;
    } catch {
      this.logger.warn('Access token validation failed');
      return null;
    }
  }

  /**
   * Validates a refresh token and returns the associated user ID.
   * Checks for token existence, expiration, and revocation status.
   * @param token - The refresh token to validate
   * @returns The user ID if the token is valid, null otherwise
   */
  async validateRefreshToken(token: string): Promise<string | null> {
    const storedToken = await this.refreshTokenRepository.findByToken(token);

    if (!storedToken) {
      this.logger.warn('Refresh token not found');
      return null;
    }

    if (storedToken.expiresAt < new Date()) {
      this.logger.warn('Refresh token expired');
      await this.refreshTokenRepository.delete(token);
      return null;
    }

    if (storedToken.revoked) {
      this.logger.warn('Refresh token has been revoked');
      return null;
    }

    return storedToken.userId;
  }

  /**
   * Revokes a specific refresh token.
   * @param token - The refresh token to revoke
   */
  async revokeRefreshToken(token: string): Promise<void> {
    this.logger.log('Revoking refresh token');
    await this.refreshTokenRepository.revoke(token);
  }

  /**
   * Revokes all refresh tokens for a specific user.
   * Useful for security operations like password changes or account compromise.
   * @param userId - The ID of the user whose tokens should be revoked
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    this.logger.log(`Revoking all tokens for user: ${userId}`);
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  /**
   * Generates a unique token for password reset operations.
   * @returns A unique password reset token string
   */
  generatePasswordResetToken(): string {
    return uuidv4();
  }
}
