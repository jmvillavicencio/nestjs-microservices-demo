import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RefreshToken } from '@prisma/client';

/**
 * Data required to create a new refresh token.
 */
export interface CreateRefreshTokenData {
  token: string;
  userId: string;
  expiresAt: Date;
}

export { RefreshToken };

/**
 * Repository for managing refresh tokens in the database.
 * Provides operations for token creation, validation, and revocation.
 */
@Injectable()
export class RefreshTokenRepository {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new refresh token in the database.
   * @param data - The token data to create
   * @returns The created refresh token
   */
  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    this.logger.log(`Creating refresh token for user: ${data.userId}`);

    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revoked: false,
      },
    });

    return refreshToken;
  }

  /**
   * Finds a refresh token by its token string.
   * @param token - The token string to search for
   * @returns The refresh token or null if not found
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    });
  }

  /**
   * Deletes a refresh token from the database.
   * @param token - The token string to delete
   */
  async delete(token: string): Promise<void> {
    this.logger.log('Deleting refresh token');

    await this.prisma.refreshToken.delete({
      where: { token },
    }).catch(() => {
      // Token may already be deleted
    });
  }

  /**
   * Revokes a refresh token, marking it as invalid.
   * @param token - The token string to revoke
   */
  async revoke(token: string): Promise<void> {
    this.logger.log('Revoking refresh token');

    await this.prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    }).catch(() => {
      // Token may not exist
    });
  }

  /**
   * Revokes all refresh tokens for a specific user.
   * Useful for security operations like password changes.
   * @param userId - The user's unique ID
   */
  async revokeAllForUser(userId: string): Promise<void> {
    this.logger.log(`Revoking all refresh tokens for user: ${userId}`);

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  /**
   * Removes all expired tokens from the database.
   * Should be run periodically to clean up old tokens.
   */
  async cleanupExpired(): Promise<void> {
    this.logger.log('Cleaning up expired refresh tokens');

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired tokens`);
  }
}
